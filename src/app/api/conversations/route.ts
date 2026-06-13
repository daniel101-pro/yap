import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeConversation } from '@/lib/serializers-messages';

const conversationInclude = {
  listing: { select: { title: true } },
  buyer: true,
  seller: true,
  messages: { orderBy: { createdAt: 'asc' as const }, include: { sender: true } },
};

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: user.id }, { sellerId: user.id }],
    },
    orderBy: { lastMessageAt: 'desc' },
    include: conversationInclude,
  });

  return NextResponse.json({
    conversations: conversations.map((c) => serializeConversation(c, user.id)),
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const listingId = typeof body.listingId === 'string' ? body.listingId : '';
  const initialMessage =
    typeof body.initialMessage === 'string' ? body.initialMessage.trim() : '';

  if (!listingId) {
    return NextResponse.json({ error: 'Listing ID required' }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: true },
  });

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (listing.sellerId === user.id) {
    return NextResponse.json({ error: 'Cannot message your own listing' }, { status: 400 });
  }

  const existing = await prisma.conversation.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: user.id } },
    include: conversationInclude,
  });

  if (existing) {
    return NextResponse.json({
      conversation: serializeConversation(existing, user.id),
    });
  }

  const created = await prisma.conversation.create({
    data: {
      listingId,
      buyerId: user.id,
      sellerId: listing.sellerId,
      lastMessage: initialMessage || '',
      lastMessageAt: new Date(),
    },
    include: conversationInclude,
  });

  if (initialMessage) {
    await prisma.message.create({
      data: {
        conversationId: created.id,
        senderId: user.id,
        content: initialMessage,
      },
    });

    await prisma.notification.create({
      data: {
        userId: listing.sellerId,
        type: 'comment',
        title: 'New message',
        body: `Someone asked about "${listing.title}"`,
        listingId: listing.id,
      },
    });
  }

  const conversation = initialMessage
    ? await prisma.conversation.findUnique({
        where: { id: created.id },
        include: conversationInclude,
      })
    : created;

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 500 });
  }

  return NextResponse.json({
    conversation: serializeConversation(conversation, user.id),
  });
}
