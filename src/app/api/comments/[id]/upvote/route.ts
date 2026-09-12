import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeComment } from '@/lib/serializers';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`upvote:${user.id}`, 40, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many votes. Please slow down.' }, { status: 429 });
  }

  const { id } = await params;
  const existing = await prisma.comment.findUnique({
    where: { id },
    include: { post: true },
  });

  if (!existing || existing.hiddenAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const alreadyVoted = await prisma.commentUpvote.findUnique({
    where: { commentId_userId: { commentId: id, userId: user.id } },
  });

  if (!alreadyVoted) {
    await prisma.$transaction([
      prisma.commentUpvote.create({ data: { commentId: id, userId: user.id } }),
      prisma.comment.update({ where: { id }, data: { upvotes: { increment: 1 } } }),
    ]);
  }

  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    comment: serializeComment(comment, user.id, existing.post.authorId),
  });
}
