import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { LIMITS, parseBoundedNumber } from '@/lib/validation';

type RouteContext = { params: Promise<{ ticketId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ticketId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const price = parseBoundedNumber(body.price, 0.5, LIMITS.priceMax);
  if (price === null) {
    return NextResponse.json({ error: 'Valid price required' }, { status: 400 });
  }

  const ticket = await prisma.nightlifeTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, sellerId: true, status: true },
  });

  if (!ticket || ticket.sellerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (ticket.status !== 'active') {
    return NextResponse.json({ error: 'Only live listings can be edited' }, { status: 400 });
  }

  const updated = await prisma.nightlifeTicket.update({
    where: { id: ticketId },
    data: { price },
    select: { id: true, price: true },
  });

  return NextResponse.json({ ticket: updated });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ticketId } = await context.params;

  const ticket = await prisma.nightlifeTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, sellerId: true, status: true },
  });

  if (!ticket || ticket.sellerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (ticket.status === 'sold') {
    return NextResponse.json({ error: 'Sold tickets cannot be removed' }, { status: 400 });
  }

  if (ticket.status === 'reserved') {
    return NextResponse.json({ error: 'Checkout in progress. Try again in a few minutes.' }, { status: 400 });
  }

  await prisma.nightlifeTicket.delete({ where: { id: ticketId } });

  return NextResponse.json({ ok: true });
}
