import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializeListing } from '@/lib/serializers';
import { createNotification } from '@/lib/notifications';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.listingSave.findUnique({
    where: { userId_listingId: { userId: user.id, listingId: id } },
  });

  if (existing) {
    await prisma.listingSave.delete({
      where: { userId_listingId: { userId: user.id, listingId: id } },
    });
  } else {
    await prisma.listingSave.create({
      data: { userId: user.id, listingId: id },
    });

    const listingMeta = await prisma.listing.findUnique({
      where: { id },
      select: { sellerId: true, title: true },
    });
    if (listingMeta && listingMeta.sellerId !== user.id) {
      await createNotification({
        userId: listingMeta.sellerId,
        type: 'listing_saved',
        title: 'Someone saved your listing',
        body: `"${listingMeta.title}" was saved`,
        listingId: id,
      });
    }
  }

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: { include: { _count: { select: { listings: { where: { isSold: true } } } } } },
      _count: { select: { saves: true } },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const saved = await prisma.listingSave.findUnique({
    where: { userId_listingId: { userId: user.id, listingId: id } },
  });

  return NextResponse.json({
    listing: serializeListing(listing, user.id),
    saved: Boolean(saved),
  });
}
