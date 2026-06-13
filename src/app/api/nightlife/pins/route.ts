import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializePin } from '@/lib/serializers';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const pin = await prisma.nightlifePin.create({
    data: {
      name: String(body.name ?? '').trim(),
      type: body.type === 'nightclub' ? 'nightclub' : 'house-party',
      address: String(body.address ?? '').trim(),
      mapsQuery: String(body.mapsQuery ?? body.address ?? '').trim(),
      lat: Number(body.lat),
      lng: Number(body.lng),
      isOpen: Boolean(body.isOpen),
    },
  });

  return NextResponse.json({ pin: serializePin(pin) });
}
