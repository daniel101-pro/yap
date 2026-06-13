import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializePost } from '@/lib/serializers';
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
