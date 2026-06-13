import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializePost } from '@/lib/serializers';
import { parseJson, toJson } from '@/lib/json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { optionId } = await request.json();

  if (typeof optionId !== 'number') {
    return NextResponse.json({ error: 'Invalid option' }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post?.pollQuestion) {
    return NextResponse.json({ error: 'No poll on this post' }, { status: 400 });
  }

  const existingVote = await prisma.pollVote.findUnique({
    where: { postId_userId: { postId: id, userId: user.id } },
  });

  if (existingVote) {
    return NextResponse.json({ error: 'Already voted' }, { status: 400 });
  }

  const options = parseJson<{ id: number; text: string; votes: number }[]>(post.pollOptions, []);
  const updatedOptions = options.map((opt) =>
    opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt,
  );

  await prisma.$transaction([
    prisma.pollVote.create({ data: { postId: id, userId: user.id, optionId } }),
    prisma.post.update({
      where: { id },
      data: {
        pollOptions: toJson(updatedOptions),
        pollTotalVotes: post.pollTotalVotes + 1,
      },
    }),
  ]);

  const updated = await prisma.post.findUnique({
    where: { id },
    include: {
      reactions: true,
      pollVotes: { where: { userId: user.id } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ post: serializePost(updated!, user.id) });
}
