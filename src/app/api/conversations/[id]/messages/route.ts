import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeMessage } from '@/lib/serializers-messages';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!content) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { listing: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (conversation.buyerId !== user.id && conversation.sellerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: user.id,
      content,
    },
    include: { sender: true },
  });

  await prisma.conversation.update({
    where: { id },
    data: { lastMessage: content, lastMessageAt: new Date() },
  });

  const recipientId =
    conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;

  if (recipientId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: 'comment',
        title: 'New message',
        body: content.slice(0, 80),
        listingId: conversation.listingId,
      },
    });
  }

  return NextResponse.json({
    message: serializeMessage(message, user.id),
  });
}
