import { prisma } from '@/lib/prisma';
import { mockPosts, mockSellers } from '@/lib/mock-data';
import { toJson } from '@/lib/json';

const DEFAULT_PINS = [
  {
    name: 'Timepiece',
    type: 'nightclub',
    address: 'Little Castle Street, Exeter EX4 3PX',
    mapsQuery: 'Timepiece Exeter',
    lat: 50.7225,
    lng: -3.5326,
    isOpen: true,
  },
  {
    name: 'Arena Exeter',
    type: 'nightclub',
    address: '17-18 King William Street, Exeter EX4 6PD',
    mapsQuery: 'Arena Exeter nightclub',
    lat: 50.7217,
    lng: -3.5319,
    isOpen: true,
  },
  {
    name: 'Move Exeter',
    type: 'nightclub',
    address: '4 The Quay, Exeter EX2 4AP',
    mapsQuery: 'Move Exeter',
    lat: 50.7188,
    lng: -3.5315,
    isOpen: false,
  },
  {
    name: 'Pennsylvania House Party',
    type: 'house-party',
    address: 'Pennsylvania Road, Exeter',
    mapsQuery: 'Pennsylvania Road Exeter',
    lat: 50.7358,
    lng: -3.5268,
    isOpen: false,
  },
];

export async function seedDatabaseIfEmpty() {
  const postCount = await prisma.post.count();
  if (postCount > 0) return;

  const sellerMap: Record<string, string> = {};

  for (const seller of mockSellers) {
    const email = `seed-${seller.id}@exeter.ac.uk`;
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        emailVerified: new Date(),
        anonymousHandle: seller.name,
        karma: Math.round(seller.rating * 100),
      },
      update: {},
    });
    sellerMap[seller.id] = user.id;
  }

  const systemUser = await prisma.user.upsert({
    where: { email: 'seed-system@exeter.ac.uk' },
    create: {
      email: 'seed-system@exeter.ac.uk',
      emailVerified: new Date(),
      anonymousHandle: 'CampusGhost',
      karma: 420,
    },
    update: {},
  });

  for (const post of mockPosts) {
    await prisma.post.create({
      data: {
        authorId: systemUser.id,
        content: post.content,
        category: post.category,
        media: toJson(post.media ?? []),
        pollQuestion: post.poll?.question ?? null,
        pollOptions: post.poll ? toJson(post.poll.options) : null,
        pollTotalVotes: post.poll?.totalVotes ?? 0,
        createdAt: post.timestamp,
      },
    });
  }

  for (const pin of DEFAULT_PINS) {
    await prisma.nightlifePin.create({ data: pin });
  }

  const ticketSeller = sellerMap['s1'] ?? systemUser.id;
  await prisma.nightlifeTicket.createMany({
    data: [
      {
        sellerId: ticketSeller,
        title: '2x TP Friday Guestlist',
        venue: 'Timepiece',
        price: 10,
        eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
        quantity: 2,
        status: 'active',
      },
      {
        sellerId: sellerMap['s2'] ?? systemUser.id,
        title: 'Arena Saturday Ticket',
        venue: 'Arena Exeter',
        price: 7,
        eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
        quantity: 1,
        status: 'active',
      },
    ],
  });
}
