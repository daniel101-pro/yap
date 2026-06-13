import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeComment } from '@/lib/serializers';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.comment.findUnique({
    where: { id },
    include: { post: true },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: { upvotes: { increment: 1 } },
  });

  return NextResponse.json({
    comment: serializeComment(comment, user.id, existing.post.authorId),
  });
}
