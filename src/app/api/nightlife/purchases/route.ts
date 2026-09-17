import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { serializeNightlifePurchase } from '@/lib/serializers';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tickets = await prisma.nightlifeTicket.findMany({
    where: { buyerId: user.id, status: 'sold' },
    orderBy: { soldAt: 'desc' },
    take: 40,
    select: {
      id: true,
      title: true,
      venue: true,
      eventDate: true,
      eventEndDate: true,
      soldAt: true,
      ticketProofUrl: true,
      ticketProofMime: true,
      ticketProofData: true,
    },
  });

  return NextResponse.json({
    purchases: tickets.map((t) => serializeNightlifePurchase(t)),
  });
}
