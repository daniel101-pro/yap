import { seedAuthorFilter } from '@/lib/seed-bots';
import type { Prisma } from '@prisma/client';

/** Active resale listings visible in feed / event sheets (not reserved or sold). */
export function publicActiveNightlifeTicketsWhere(
  viewerId: string,
  now: Date = new Date(),
): Prisma.NightlifeTicketWhereInput {
  return {
    seller: { ...seedAuthorFilter, isBanned: false },
    status: 'active',
    OR: [
      { eventEndDate: { gte: now } },
      { AND: [{ eventEndDate: null }, { eventDate: { gte: now } }] },
      { sellerId: viewerId },
    ],
  };
}
