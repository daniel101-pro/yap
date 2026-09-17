import { seedAuthorFilter } from '@/lib/seed-bots';
import type { Prisma } from '@prisma/client';

const NIGHT_STILL_ON_GRACE_MS = 12 * 60 * 60 * 1000;

function nightStillOnOrUpcoming(now: Date): Prisma.NightlifeTicketWhereInput[] {
  const graceStart = new Date(now.getTime() - NIGHT_STILL_ON_GRACE_MS);
  return [
    { eventEndDate: { gte: now } },
    { AND: [{ eventEndDate: null }, { eventDate: { gte: graceStart } }] },
  ];
}

/** Active resale listings visible in feed / bootstrap (not reserved or sold). */
export function publicActiveNightlifeTicketsWhere(
  viewerId: string,
  now: Date = new Date(),
): Prisma.NightlifeTicketWhereInput {
  return {
    seller: { ...seedAuthorFilter, isBanned: false },
    status: 'active',
    OR: [...nightStillOnOrUpcoming(now), { sellerId: viewerId }],
  };
}

/** Listings for a specific MyNightOut event sheet — no date gate (MNO event is live). */
export function activeNightlifeTicketsForMnoEventWhere(
  mnoEventId: string,
): Prisma.NightlifeTicketWhereInput {
  const id = mnoEventId.trim();
  const short = id.slice(0, 32);
  const idMatch: Prisma.NightlifeTicketWhereInput =
    id === short ? { mnoEventId: id } : { OR: [{ mnoEventId: id }, { mnoEventId: short }] };

  return {
    seller: { ...seedAuthorFilter, isBanned: false },
    status: 'active',
    ...idMatch,
  };
}
