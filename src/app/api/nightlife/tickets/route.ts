import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { ensureAnonymousHandle } from '@/lib/anonymous';
import { serializeTicket } from '@/lib/serializers';
import { checkRateLimit } from '@/lib/rate-limit';
import { clampString, LIMITS, parseBoundedNumber } from '@/lib/validation';

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

  if (!title || !venue || price === null || quantity === null) {
    return NextResponse.json({ error: 'Valid title, venue, price, and quantity required' }, { status: 400 });
  }

  const eventDate = body.eventDate ? new Date(body.eventDate) : new Date(Date.now() + 86400000);
  if (Number.isNaN(eventDate.getTime())) {
    return NextResponse.json({ error: 'Invalid event date' }, { status: 400 });
  }
  const now = Date.now();
  if (eventDate.getTime() < now - 60_000 || eventDate.getTime() > now + 366 * 86400000) {
    return NextResponse.json({ error: 'Event date must be in the next year' }, { status: 400 });
  }

  await ensureAnonymousHandle(user.id);

  const ticket = await prisma.nightlifeTicket.create({
    data: {
      sellerId: user.id,
      title,
      venue,
      price,
      eventDate,
      quantity: Math.round(quantity),
      status: 'active',
    },
    include: { seller: { select: { anonymousHandle: true } } },
  });

  return NextResponse.json({ ticket: serializeTicket(ticket) });
}
