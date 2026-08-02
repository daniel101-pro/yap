import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { blockUser } from '@/lib/moderation';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id }, select: { authorId: true } });
  if (!post) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (post.authorId === user.id) {
    return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
  }

  await blockUser(user.id, post.authorId);
  return NextResponse.json({ ok: true });
}
