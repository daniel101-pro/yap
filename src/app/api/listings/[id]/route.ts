import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeListing } from '@/lib/serializers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (listing.sellerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const isSold = typeof body.isSold === 'boolean' ? body.isSold : listing.isSold;

  const updated = await prisma.listing.update({
    where: { id },
    data: { isSold },
    include: {
      seller: { include: { _count: { select: { listings: { where: { isSold: true } } } } } },
      _count: { select: { saves: true } },
    },
  });

  return NextResponse.json({ listing: serializeListing(updated, user.id) });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });

  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (listing.sellerId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.listing.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
