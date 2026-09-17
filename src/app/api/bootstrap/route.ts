import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  serializePost,
  serializeListing,
  serializePin,
  serializeNightlifeTicketsForViewer,
  serializeNightlifePurchase,
  serializeNotification,
} from '@/lib/serializers';
import { serializeConversation } from '@/lib/serializers-messages';
import { seedDatabaseIfEmpty } from '@/lib/seed';
import { getBlockedAuthorIds } from '@/lib/moderation';
import { HOUSE_PARTY_TTL_MS, MAX_PUBLIC_PINS } from '@/lib/pin-privacy';
import { seedAuthorFilter } from '@/lib/seed-bots';
import { publicActiveNightlifeTicketsWhere } from '@/lib/nightlife-tickets-query';
import { runReactionBotTick } from '@/lib/reaction-bot-engine';

const sellerInclude = {
  seller: {
    include: {
      _count: { select: { listings: { where: { isSold: true } } } },
    },
  },
  _count: { select: { saves: true } },
};

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`bootstrap:${user.id}`, 45, 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Slow down.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000)) },
      },
    );
  }

  await seedDatabaseIfEmpty();

  const userId = user.id;
  const blockedAuthorIds = await getBlockedAuthorIds(userId);
  const now = new Date();
  const housePartyCutoff = new Date(now.getTime() - HOUSE_PARTY_TTL_MS);

  await prisma.nightlifePin.deleteMany({
    where: {
      type: 'house-party',
      OR: [
        { expiresAt: { lte: now } },
        { AND: [{ expiresAt: null }, { createdAt: { lte: housePartyCutoff } }] },
      ],
    },
  });

  const [
    dbUser,
    posts,
    listings,
    nightlifeTickets,
    nightlifePurchases,
    nightlifePins,
    notifications,
    saves,
    conversations,
  ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, anonymousHandle: true, karma: true },
      }),
      prisma.post.findMany({
        where: {
          author: { ...seedAuthorFilter, isBanned: false },
          authorId: { notIn: blockedAuthorIds },
          hiddenAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          reactions: true,
          pollVotes: { where: { userId } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.listing.findMany({
        where: {
          seller: { ...seedAuthorFilter, isBanned: false },
          sellerId: { notIn: blockedAuthorIds },
          hiddenAt: null,
          OR: [{ isSold: false }, { sellerId: userId }],
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: sellerInclude,
      }),
      prisma.nightlifeTicket.findMany({
        where: publicActiveNightlifeTicketsWhere(userId, now),
        orderBy: { eventDate: 'asc' },
        take: 200,
        include: {
          seller: { select: { id: true, anonymousHandle: true, stripeAccountId: true } },
        },
      }),
      prisma.nightlifeTicket.findMany({
        where: { buyerId: userId, status: 'sold' },
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
      }),
      prisma.nightlifePin.findMany({
        where: {
          OR: [
            { type: 'nightclub' },
            {
              type: 'house-party',
              OR: [
                { expiresAt: { gt: now } },
                { AND: [{ expiresAt: null }, { createdAt: { gt: housePartyCutoff } }] },
              ],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_PUBLIC_PINS,
      }),
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
          buyer: { select: { id: true, anonymousHandle: true } },
          seller: { select: { id: true, anonymousHandle: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 50,
            include: { sender: { select: { id: true, anonymousHandle: true } } },
          },
        },
      }),
    ]);

  const serializedTickets = await serializeNightlifeTicketsForViewer(nightlifeTickets, userId);

  const botTick = checkRateLimit('reaction-bot-tick-global', 1, 7 * 60 * 1000);
  if (botTick.ok) {
    void runReactionBotTick().catch((err) => console.error('[bootstrap] reaction bots', err));
  }

  return NextResponse.json(
    {
      user: dbUser
        ? {
            id: dbUser.id,
            anonymousHandle: dbUser.anonymousHandle ?? 'Anonymous',
            karma: dbUser.karma,
          }
        : { id: userId, anonymousHandle: 'Anonymous', karma: 0 },
      posts: posts.map((p) => serializePost(p, userId)),
      listings: listings.map((l) => serializeListing(l, userId)),
      nightlifeTickets: serializedTickets,
      nightlifePurchases: nightlifePurchases.map((t) => serializeNightlifePurchase(t)),
      nightlifePins: nightlifePins.map((p) => serializePin(p, userId)),
      notifications: notifications.map((n) => serializeNotification(n)),
      savedListingIds: saves.map((s) => s.listingId),
      conversations: conversations.map((c) => serializeConversation(c, userId)),
    },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
