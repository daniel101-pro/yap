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
import { serializeConversation } from '@/lib/serializers-messages';
import { seedDatabaseIfEmpty } from '@/lib/seed';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await seedDatabaseIfEmpty();

  const userId = user.id;

  const [posts, listings, nightlifeTickets, nightlifePins, notifications, saves, conversations] =
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
      prisma.conversation.findMany({
        where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          listing: { select: { title: true } },
          buyer: true,
          seller: true,
          messages: { orderBy: { createdAt: 'asc' }, take: 50, include: { sender: true } },
        },
      }),
    ]);

  return NextResponse.json({
    posts: posts.map((p) => serializePost(p, userId)),
    listings: listings.map((l) => serializeListing(l)),
    nightlifeTickets: nightlifeTickets.map((t) => serializeTicket(t)),
    nightlifePins: nightlifePins.map((p) => serializePin(p)),
    notifications: notifications.map((n) => serializeNotification(n)),
    savedListingIds: saves.map((s) => s.listingId),
    conversations: conversations.map((c) => serializeConversation(c, userId)),
  });
}
