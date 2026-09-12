import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { serializePin } from '@/lib/serializers';
import { checkRateLimit } from '@/lib/rate-limit';
import { clampString } from '@/lib/validation';
import { LIMITS } from '@/lib/validation';
import {
  housePartyExpiry,
  isInExeterBounds,
  MAX_ACTIVE_HOUSE_PARTIES_PER_USER,
} from '@/lib/pin-privacy';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`create-pin:${user.id}`, 5, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'You are adding pins too quickly. Please wait before dropping another.' },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = clampString(body.name, LIMITS.pinName);
  const address = clampString(body.address, LIMITS.pinAddress);
  const mapsQuery = clampString(body.mapsQuery ?? body.address, LIMITS.pinMapsQuery);
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const type = body.type === 'nightclub' ? 'nightclub' : 'house-party';

  if (!name || !address) {
    return NextResponse.json({ error: 'Name and address required' }, { status: 400 });
  }

  if (!isInExeterBounds(lat, lng)) {
    return NextResponse.json(
      { error: 'Pins must be placed within the Exeter campus area.' },
      { status: 400 },
    );
  }

  if (type === 'house-party') {
    const activeCount = await prisma.nightlifePin.count({
      where: {
        createdById: user.id,
        type: 'house-party',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
    if (activeCount >= MAX_ACTIVE_HOUSE_PARTIES_PER_USER) {
      return NextResponse.json(
        { error: 'You already have the maximum number of active house-party pins.' },
        { status: 400 },
      );
    }
  }

  const pin = await prisma.nightlifePin.create({
    data: {
      name,
      type,
      address,
      mapsQuery,
      lat,
      lng,
      isOpen: Boolean(body.isOpen),
      createdById: user.id,
      expiresAt: type === 'house-party' ? housePartyExpiry() : null,
    },
  });

  return NextResponse.json({ pin: serializePin(pin, user.id) });
}
