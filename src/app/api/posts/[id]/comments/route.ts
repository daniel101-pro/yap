import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeComment } from '@/lib/serializers';
import { createNotification } from '@/lib/notifications';
import { checkRateLimit } from '@/lib/rate-limit';
import { getBlockedAuthorIds } from '@/lib/moderation';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const blockedAuthorIds = await getBlockedAuthorIds(user.id);
  const visible = {
    hiddenAt: null,
    authorId: { notIn: blockedAuthorIds },
    author: { isBanned: false },
  };

  const comments = await prisma.comment.findMany({
    where: { postId: id, parentId: null, ...visible },
    orderBy: { createdAt: 'desc' },
    include: {
      replies: {
        where: visible,
        orderBy: { createdAt: 'asc' },
        include: { replies: { where: visible } },
      },
    },
  });

  return NextResponse.json({
    comments: comments.map((c) => serializeComment(c, user.id, post.authorId)),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`create-comment:${user.id}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'You are commenting too fast. Please slow down.' }, { status: 429 });
  }

  const { id } = await params;
  const body = await request.json();
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const parentId = typeof body.parentId === 'string' ? body.parentId : undefined;

  if (!content) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      postId: id,
      authorId: user.id,
      parentId,
      content,
    },
  });

  if (post.authorId !== user.id) {
    await createNotification({
      userId: post.authorId,
      type: parentId ? 'reply' : 'comment',
      title: parentId ? 'New reply on your yap' : 'New comment on your yap',
      body: content.slice(0, 120),
      postId: id,
    });
  }

  return NextResponse.json({
    comment: serializeComment(comment, user.id, post.authorId),
  });
}
