import { prisma } from '@/lib/prisma';
import { pickTrendingSlotId } from '@/lib/nightlife-slot-demand';

export async function getEventSlotDemand(eventId: string, ticketOrder: string[]) {
  const rows = await prisma.nightlifeTicket.groupBy({
    by: ['mnoTicketId'],
    where: {
      mnoEventId: eventId,
      mnoTicketId: { not: null },
      status: { in: ['sold', 'reserved'] },
    },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row.mnoTicketId) counts[row.mnoTicketId] = row._count._all;
  }

  return {
    counts,
    trendingSlotId: pickTrendingSlotId(counts, ticketOrder),
  };
}
