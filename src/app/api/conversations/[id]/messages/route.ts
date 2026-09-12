import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeMessage } from '@/lib/serializers-messages';
import { checkRateLimit } from '@/lib/rate-limit';
import { isEitherBlocked } from '@/lib/moderation';
import { clampString, LIMITS } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`send-message:${user.id}`, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'You are messaging too fast. Please slow down.' }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const content = clampString(body.content, LIMITS.message);

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

  const otherId = conversation.buyerId === user.id ? conversation.sellerId : conversation.buyerId;
  if (await isEitherBlocked(user.id, otherId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: user.id,
      content,
    },
    include: { sender: { select: { id: true, anonymousHandle: true } } },
  });

  await prisma.conversation.update({
    where: { id },
    data: { lastMessage: content, lastMessageAt: new Date() },
  });

  if (otherId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: otherId,
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
