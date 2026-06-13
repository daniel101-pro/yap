import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { ensureAnonymousHandle } from '@/lib/anonymous';
import { serializeTicket } from '@/lib/serializers';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  await ensureAnonymousHandle(user.id);

  const ticket = await prisma.nightlifeTicket.create({
    data: {
      sellerId: user.id,
      title: String(body.title ?? '').trim(),
      venue: String(body.venue ?? '').trim(),
      price: Number(body.price) || 0,
      eventDate: body.eventDate ? new Date(body.eventDate) : new Date(Date.now() + 86400000),
      quantity: Math.max(1, Number(body.quantity) || 1),
      status: 'active',
    },
    include: { seller: true },
  });

  return NextResponse.json({ ticket: serializeTicket(ticket) });
}
