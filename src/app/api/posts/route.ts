import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { ensureAnonymousHandle } from '@/lib/anonymous';
import { serializePost } from '@/lib/serializers';
import { toJson } from '@/lib/json';
import { checkRateLimit } from '@/lib/rate-limit';
import {
  clampString,
  isPostCategory,
  LIMITS,
  sanitizeMediaItems,
  sanitizePoll,
} from '@/lib/validation';
import { isSeedEmail } from '@/lib/seed-bots';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isSeedEmail(user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const limit = checkRateLimit(`create-post:${user.id}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'You are posting too fast. Please slow down.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const content = clampString(body.content, LIMITS.postContent);
  const category = isPostCategory(body.category) ? body.category : 'confessions';
  const media = sanitizeMediaItems(body.media);
  const poll = sanitizePoll(body);

  if (!content && !poll && media.length === 0) {
    return NextResponse.json({ error: 'Content required' }, { status: 400 });
  }

  await ensureAnonymousHandle(user.id);

  const post = await prisma.post.create({
    data: {
      authorId: user.id,
      content,
      category,
      media: toJson(media),
      pollQuestion: poll?.question ?? null,
      pollOptions: poll ? toJson(poll.options) : null,
      pollTotalVotes: 0,
    },
    include: {
      reactions: true,
      pollVotes: { where: { userId: user.id } },
      _count: { select: { comments: true } },
    },
  });

  return NextResponse.json({
    post: serializePost(post, user.id),
  });
}
