import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import {
  serializePost,
  serializeListing,
  serializeTicket,
  serializePin,
  serializeNotification,
} from '@/lib/serializers';
import { seedDatabaseIfEmpty } from '@/lib/seed';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await seedDatabaseIfEmpty();

  const userId = user.id;

  const [posts, listings, nightlifeTickets, nightlifePins, notifications, saves] =
    await Promise.all([
      prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          reactions: true,
          pollVotes: { where: { userId } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.listing.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          seller: true,
          _count: { select: { saves: true } },
        },
      }),
      prisma.nightlifeTicket.findMany({
        orderBy: { eventDate: 'asc' },
        include: { seller: true },
      }),
      prisma.nightlifePin.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.listingSave.findMany({
        where: { userId },
        select: { listingId: true },
      }),
    ]);

  return NextResponse.json({
    posts: posts.map((p) => serializePost(p, userId)),
    listings: listings.map((l) => serializeListing(l)),
    nightlifeTickets: nightlifeTickets.map((t) => serializeTicket(t)),
    nightlifePins: nightlifePins.map((p) => serializePin(p)),
    notifications: notifications.map((n) => serializeNotification(n)),
    savedListingIds: saves.map((s) => s.listingId),
  });
}
