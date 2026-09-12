import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/** Release a ticket back to active when buyer cancels Stripe Checkout. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ticketId } = await request.json();
  if (!ticketId || typeof ticketId !== 'string') {
    return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
  }

  await prisma.nightlifeTicket.updateMany({
    where: { id: ticketId, status: 'reserved' },
    data: { status: 'active' },
  });

  return NextResponse.json({ ok: true });
}
