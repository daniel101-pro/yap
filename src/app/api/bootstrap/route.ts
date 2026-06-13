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

const sellerInclude = {
  seller: {
    include: {
      _count: { select: { listings: { where: { isSold: true } } } },
    },
  },
  _count: { select: { saves: true } },
};

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await seedDatabaseIfEmpty();

  const userId = user.id;

  const [dbUser, posts, listings, nightlifeTickets, nightlifePins, notifications, saves, conversations] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, anonymousHandle: true, karma: true },
      }),
      prisma.post.findMany({
        where: {
          author: { email: { not: { startsWith: 'seed-' } } },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          reactions: true,
          pollVotes: { where: { userId } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.listing.findMany({
        where: {
          seller: { email: { not: { startsWith: 'seed-' } } },
        },
        orderBy: { createdAt: 'desc' },
        include: sellerInclude,
      }),
      prisma.nightlifeTicket.findMany({
        where: {
          seller: { email: { not: { startsWith: 'seed-' } } },
        },
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
    user: dbUser
      ? {
          id: dbUser.id,
          email: dbUser.email,
          anonymousHandle: dbUser.anonymousHandle ?? 'Anonymous',
          karma: dbUser.karma,
        }
      : { id: userId, email: user.email ?? '', anonymousHandle: 'Anonymous', karma: 0 },
    posts: posts.map((p) => serializePost(p, userId)),
    listings: listings.map((l) => serializeListing(l, userId)),
    nightlifeTickets: nightlifeTickets.map((t) => serializeTicket(t)),
    nightlifePins: nightlifePins.map((p) => serializePin(p)),
    notifications: notifications.map((n) => serializeNotification(n)),
    savedListingIds: saves.map((s) => s.listingId),
    conversations: conversations.map((c) => serializeConversation(c, userId)),
  });
}
