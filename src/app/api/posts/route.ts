import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { ensureAnonymousHandle } from '@/lib/anonymous';
import { serializePost } from '@/lib/serializers';
import { toJson } from '@/lib/json';
import type { PostCategory } from '@/types';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const category = body.category as PostCategory;
  const media = Array.isArray(body.media) ? body.media : [];

  if (!content && !body.poll) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  await ensureAnonymousHandle(user.id);

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      content,
      category: category ?? 'confessions',
      media: toJson(media),
      pollQuestion: body.poll?.question ?? null,
      pollOptions: body.poll?.options ? toJson(body.poll.options) : null,
      pollTotalVotes: 0,
    },
    include: {
      reactions: true,
      pollVotes: { where: { userId: user.id } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({ post: serializePost(post, user.id) });
}
