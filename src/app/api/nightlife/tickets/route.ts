import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { ensureAnonymousHandle } from '@/lib/anonymous';
import { serializeTicket } from '@/lib/serializers';
import { checkRateLimit } from '@/lib/rate-limit';
import { clampString, LIMITS, parseBoundedNumber } from '@/lib/validation';
import { decodeTicketProofBase64, isAllowedTicketProofUrl } from '@/lib/ticket-proof';
import { publicActiveNightlifeTicketsWhere } from '@/lib/nightlife-tickets-query';

function prismaBytesFromBuffer(buf: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(buf.length);
  copy.set(buf);
  return copy as Uint8Array<ArrayBuffer>;
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mnoEventId = request.nextUrl.searchParams.get('mnoEventId')?.trim() ?? '';
  const now = new Date();

  const tickets = await prisma.nightlifeTicket.findMany({
    where: {
      ...publicActiveNightlifeTicketsWhere(user.id, now),
      ...(mnoEventId ? { mnoEventId: mnoEventId.slice(0, 32) } : {}),
    },
    orderBy: [{ price: 'asc' }, { createdAt: 'desc' }],
    take: mnoEventId ? 80 : 200,
    include: { seller: { select: { anonymousHandle: true } } },
  });

  return NextResponse.json({
    tickets: tickets.map((t) => serializeTicket(t)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`create-ticket:${user.id}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'You are posting too fast. Please slow down.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const title = clampString(body.title, LIMITS.ticketTitle);
  const venue = clampString(body.venue, LIMITS.ticketVenue);
  const price = parseBoundedNumber(body.price, 0.5, LIMITS.priceMax);
  const quantity = parseBoundedNumber(body.quantity ?? 1, 1, LIMITS.ticketQtyMax);

  const ticketProofUrl =
    typeof body.ticketProofUrl === 'string' ? body.ticketProofUrl.trim() : '';
  const ticketProofMime =
    typeof body.ticketProofMime === 'string' ? body.ticketProofMime.trim().slice(0, 80) : null;
  const ticketProofBase64 =
    typeof body.ticketProofBase64 === 'string' ? body.ticketProofBase64.trim() : '';

  if (!title || !venue || price === null || quantity === null) {
    return NextResponse.json({ error: 'Valid title, venue, price, and quantity required' }, { status: 400 });
  }

  let ticketProofData: Uint8Array<ArrayBuffer> | undefined;
  if (ticketProofBase64) {
    const decoded = decodeTicketProofBase64(ticketProofBase64);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid ticket file upload' }, { status: 400 });
    }
    ticketProofData = prismaBytesFromBuffer(decoded);
  } else if (!ticketProofUrl || !isAllowedTicketProofUrl(ticketProofUrl)) {
    return NextResponse.json({ error: 'Upload your ticket (screenshot or PDF) before listing' }, { status: 400 });
  }

  const eventDate = body.eventDate ? new Date(body.eventDate) : new Date(Date.now() + 86400000);
  if (Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: 'Invalid event date' }, { status: 400 });
  }
  const eventEndRaw = body.eventEndDate ? new Date(body.eventEndDate) : null;
  const eventEnd =
    eventEndRaw && !Number.isNaN(eventEndRaw.getTime())
      ? eventEndRaw
      : new Date(eventDate.getTime() + 6 * 60 * 60 * 1000);
  const now = Date.now();
  if (eventEnd.getTime() < now - 60_000) {
    return NextResponse.json({ error: 'That night is already over' }, { status: 400 });
  }
  if (eventDate.getTime() > now + 366 * 86400000) {
    return NextResponse.json({ error: 'Event date is too far out' }, { status: 400 });
  }

  const mnoEventId =
    typeof body.mnoEventId === 'string' && body.mnoEventId.trim() ? body.mnoEventId.trim().slice(0, 32) : null;
  const mnoTicketId =
    typeof body.mnoTicketId === 'string' && body.mnoTicketId.trim()
      ? body.mnoTicketId.trim().slice(0, 32)
      : null;

  await ensureAnonymousHandle(user.id);

  const ticket = await prisma.nightlifeTicket.create({
    data: {
      sellerId: user.id,
      title,
      venue,
      price,
      eventDate,
      eventEndDate: eventEnd,
      quantity: Math.round(quantity),
      status: 'active',
      mnoEventId,
      mnoTicketId,
      ticketProofUrl: ticketProofData ? null : ticketProofUrl,
      ticketProofMime,
      ticketProofData,
    },
    include: { seller: { select: { anonymousHandle: true } } },
  });

  return NextResponse.json({ ticket: serializeTicket(ticket) });
}
