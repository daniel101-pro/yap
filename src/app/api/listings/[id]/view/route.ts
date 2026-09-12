import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeListing } from '@/lib/serializers';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const visible = await prisma.listing.findFirst({
    where: { id, hiddenAt: null, seller: { isBanned: false } },
    select: { id: true },
  });
  if (!visible) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const shouldCount = checkRateLimit(`listing-view:${user.id}:${id}`, 1, 30 * 60 * 1000);
  const listing = await prisma.listing.update({
    where: { id },
    data: shouldCount.ok ? { views: { increment: 1 } } : {},
    include: {
      seller: { include: { _count: { select: { listings: { where: { isSold: true } } } } } },
      _count: { select: { saves: true } },
    },
  }).catch(() => null);

  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ listing: serializeListing(listing, user.id) });
}
