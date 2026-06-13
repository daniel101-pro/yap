import { prisma } from '@/lib/prisma';

const DEFAULT_PINS = [
  {
    name: 'Timepiece',
    type: 'nightclub',
    address: 'Little Castle Street, Exeter EX4 3PX',
    mapsQuery: 'Timepiece Exeter',
    lat: 50.7225,
    lng: -3.5326,
    isOpen: true,
  },
  {
    name: 'Arena Exeter',
    type: 'nightclub',
    address: '17-18 King William Street, Exeter EX4 6PD',
    mapsQuery: 'Arena Exeter nightclub',
    lat: 50.7217,
    lng: -3.5319,
    isOpen: true,
  },
  {
    name: 'Move Exeter',
    type: 'nightclub',
    address: '4 The Quay, Exeter EX2 4AP',
    mapsQuery: 'Move Exeter',
    lat: 50.7188,
    lng: -3.5315,
    isOpen: false,
  },
  {
    name: 'Pennsylvania House Party',
    type: 'house-party',
    address: 'Pennsylvania Road, Exeter',
    mapsQuery: 'Pennsylvania Road Exeter',
    lat: 50.7358,
    lng: -3.5268,
    isOpen: false,
  },
];

/** Seed only static venue pins — no fake posts, listings, or tickets. */
export async function seedDatabaseIfEmpty() {
  const pinCount = await prisma.nightlifePin.count();
  if (pinCount > 0) return;

  for (const pin of DEFAULT_PINS) {
    await prisma.nightlifePin.create({ data: pin });
  }
}
