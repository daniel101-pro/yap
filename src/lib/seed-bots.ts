import { prisma } from '@/lib/prisma';
import type { Reaction } from '@/types';

export const REACTION_BOT_COUNT = 200;

const PREFIXES = [
  'streatham',
  'forum',
  'glide',
  'library',
  'peninsula',
  'societies',
  'freshers',
  'lateness',
  'summit',
  'holloway',
  'ramen',
  'pint',
  'sports',
  'guild',
  'campus',
  'seminar',
  'diss',
  'nights',
  'moulse',
  'exeter',
  'sidmouth',
  'jager',
  'lecture',
  'tab',
  'union',
  'mystery',
  'anonymous',
  'quad',
  'halls',
  'laundry',
] as const;

const SUFFIXES = [
  'rat',
  'legend',
  'ghost',
  'enjoyer',
  'friend',
  'owl',
  'menace',
  'witness',
  'survivor',
  'enthusiast',
  'goon',
  'oracle',
  'menace',
  'duck',
  'menace',
  'sleeper',
  'poster',
  'lurker',
  'fan',
  'nomad',
  'gremlin',
  'scholar',
  'menace',
  'enjoyer',
  'hero',
] as const;

function buildBotProfiles(count: number): { email: string; handle: string }[] {
  const used = new Set<string>();
  const profiles: { email: string; handle: string }[] = [];

  profiles.push({ email: 'seed-system@exeter.ac.uk', handle: 'CampusGhost' });
  used.add('CampusGhost');

  let i = 1;
  while (profiles.length < count) {
    const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)]!;
    const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)]!;
    const num = Math.floor(Math.random() * 900) + 10;
    const handle = `${prefix}${suffix}${num}`.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
    if (used.has(handle)) continue;
    used.add(handle);
    profiles.push({
      email: `seed-bot-${i}@exeter.ac.uk`,
      handle,
    });
    i += 1;
  }

  return profiles;
}

const BOT_PROFILES = buildBotProfiles(REACTION_BOT_COUNT);

const REACTION_POOL: Reaction[] = ['fire', 'fire', 'real', 'dead', 'real'];

export function isSeedEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().startsWith('seed-'));
}

export const seedAuthorFilter = {
  email: { not: { startsWith: 'seed-' } },
} as const;

let cachedBotIds: string[] | null = null;

/** Cheap lookup — never upserts unless almost no bots exist. */
export async function getReactionBotIds(): Promise<string[]> {
  if (cachedBotIds && cachedBotIds.length >= 20) return cachedBotIds;

  const existing = await prisma.user.findMany({
    where: { email: { startsWith: 'seed-' } },
    select: { id: true },
  });

  if (existing.length >= 20) {
    cachedBotIds = existing.map((u) => u.id);
    return cachedBotIds;
  }

  return ensureSeedBots();
}

/** Reaction-only accounts — never authors in feed. */
export async function ensureSeedBots(): Promise<string[]> {
  if (cachedBotIds && cachedBotIds.length >= REACTION_BOT_COUNT) {
    return cachedBotIds;
  }

  const existing = await prisma.user.findMany({
    where: { email: { startsWith: 'seed-' } },
    select: { id: true, email: true },
  });

  if (existing.length >= REACTION_BOT_COUNT) {
    cachedBotIds = existing.map((u) => u.id);
    return cachedBotIds;
  }

  const have = new Set(existing.map((u) => u.email?.toLowerCase()));
  const missing = BOT_PROFILES.filter((bot) => !have.has(bot.email.toLowerCase()));
  const ids = existing.map((u) => u.id);
  const batchSize = 25;

  for (let start = 0; start < missing.length; start += batchSize) {
    const slice = missing.slice(start, start + batchSize);
    const created = await Promise.all(
      slice.map(async (bot) => {
        const user = await prisma.user.upsert({
          where: { email: bot.email },
          create: {
            email: bot.email,
            emailVerified: new Date(),
            anonymousHandle: bot.handle,
            karma: 0,
          },
          update: {},
          select: { id: true },
        });
        return user.id;
      }),
    );
    ids.push(...created);
  }

  cachedBotIds = ids;
  return ids;
}

/** @deprecated Use runReactionBotTick — no instant reaction dumps on new posts. */
export async function sprinkleSeedReactions(_postId: string): Promise<void> {
  /* drip handled by reaction-bot-engine */
}

export { REACTION_POOL };
