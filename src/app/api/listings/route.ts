import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { ensureAnonymousHandle } from '@/lib/anonymous';
import { serializeListing } from '@/lib/serializers';
import { toJson } from '@/lib/json';
import { checkRateLimit } from '@/lib/rate-limit';
import type { MarketCategory } from '@/types';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`create-listing:${user.id}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'You are posting too fast. Please slow down.' }, { status: 429 });
  }

  const body = await request.json();
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 });
  }

  await ensureAnonymousHandle(user.id);

  const listing = await prisma.listing.create({
    data: {
      sellerId: user.id,
      title,
      description: description || title,
      price: Number(body.price) || 0,
      category: (body.category as MarketCategory) ?? 'other',
      images: toJson(Array.isArray(body.images) ? body.images : []),
      condition: body.condition ?? 'good',
    },
    include: {
      seller: { include: { _count: { select: { listings: { where: { isSold: true } } } } } },
      _count: { select: { saves: true } },
    },
  });

  return NextResponse.json({ listing: serializeListing(listing, user.id) });
}
