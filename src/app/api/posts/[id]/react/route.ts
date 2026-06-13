import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializePost } from '@/lib/serializers';
import { createNotification } from '@/lib/notifications';
import type { Reaction } from '@/types';

const REACTIONS: Reaction[] = ['fire', 'cap', 'dead', 'real', 'sus'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { reaction } = await request.json();

  if (!REACTIONS.includes(reaction as Reaction)) {
    return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
  }

  const existing = await prisma.postReaction.findUnique({
    where: { postId_userId: { postId: id, userId: user.id } },
  });

  if (existing?.reaction === reaction) {
    await prisma.postReaction.delete({
      where: { postId_userId: { postId: id, userId: user.id } },
    });
  } else if (existing) {
    await prisma.postReaction.update({
      where: { postId_userId: { postId: id, userId: user.id } },
      data: { reaction },
    });
  } else {
    await prisma.postReaction.create({
      data: { postId: id, userId: user.id, reaction },
    });

    const postAuthor = await prisma.post.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (postAuthor && postAuthor.authorId !== user.id) {
      await createNotification({
        userId: postAuthor.authorId,
        type: 'reaction',
        title: 'New reaction on your yap',
        body: `Someone reacted with ${reaction} to your post`,
        postId: id,
      });
    }
  }

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      reactions: true,
      pollVotes: { where: { userId: user.id } },
      _count: { select: { comments: true } },
    },
  });

  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ post: serializePost(post, user.id) });
}
