import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeConversation } from '@/lib/serializers-messages';

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
    include: {
      listing: { select: { title: true } },
      buyer: true,
      seller: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { sender: true },
      },
    },
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

  let conversation = await prisma.conversation.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: user.id } },
    include: {
      listing: { select: { title: true } },
      buyer: true,
      seller: true,
      messages: { orderBy: { createdAt: 'asc' }, include: { sender: true } },
    },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        listingId,
        buyerId: user.id,
        sellerId: listing.sellerId,
        lastMessage: initialMessage || '',
        lastMessageAt: new Date(),
      },
      include: {
        listing: { select: { title: true } },
        buyer: true,
        seller: true,
        messages: { include: { sender: true } },
      },
    });

    if (initialMessage) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
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

      conversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          listing: { select: { title: true } },
          buyer: true,
          seller: true,
          messages: { orderBy: { createdAt: 'asc' }, include: { sender: true } },
        },
      })!;
    }
  }

  return NextResponse.json({
    conversation: serializeConversation(conversation, user.id),
  });
}
