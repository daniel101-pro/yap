import { prisma } from '@/lib/prisma';
import type { Reaction } from '@/types';
import { getReactionBotIds, seedAuthorFilter } from '@/lib/seed-bots';

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;
const POST_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
const BASELINE_TARGET = 24;
const TRENDING_TARGET = 50;
const FIRST_REACT_AFTER_MS = 90 * 1000;

const REACTION_POOL: Reaction[] = ['fire', 'fire', 'real', 'dead', 'real', 'cap', 'sus'];

function pickReaction(): Reaction {
  return REACTION_POOL[Math.floor(Math.random() * REACTION_POOL.length)]!;
}

export function expectedBotReactionsByNow(target: number, ageMs: number): number {
  if (ageMs < FIRST_REACT_AFTER_MS) return 0;
  const twoH = 2 * 60 * 60 * 1000;
  const early = Math.min(1, ageMs / twoH);
  const late = Math.min(1, ageMs / FORTY_EIGHT_H_MS);
  const curved = 0.42 * (1 - Math.exp(-3.4 * early)) + 0.58 * (1 - Math.exp(-2.3 * late));
  const jitter = (Math.random() - 0.2) * 2;
  return Math.max(0, Math.round(target * curved + jitter));
}

export type ReactionBotTickResult = {
  scanned: number;
  added: number;
  bots: number;
  spiked?: string | null;
};

type Candidate = {
  postId: string;
  deficit: number;
  reactedBotIds: Set<string>;
};

async function addReactionsToPost(
  chosen: Candidate,
  botIds: string[],
  count: number,
): Promise<number> {
  let added = 0;
  for (let i = 0; i < count; i++) {
    const availableBots = botIds.filter((id) => !chosen.reactedBotIds.has(id));
    if (availableBots.length === 0) break;
    const userId = availableBots[Math.floor(Math.random() * availableBots.length)]!;
    try {
      await prisma.postReaction.create({
        data: {
          postId: chosen.postId,
          userId,
          reaction: pickReaction(),
        },
      });
      added += 1;
      chosen.reactedBotIds.add(userId);
      chosen.deficit -= 1;
    } catch {
      chosen.reactedBotIds.add(userId);
    }
  }
  return added;
}

async function botsAlreadyOnPost(postId: string, botIdSet: Set<string>): Promise<Set<string>> {
  const rows = await prisma.postReaction.findMany({
    where: { postId, userId: { in: [...botIdSet] } },
    select: { userId: true },
  });
  return new Set(rows.map((r) => r.userId));
}

/** Drip + catch-up. Hungriest (behind-schedule) posts get reactions first. */
export async function runReactionBotTick(options?: {
  catchUp?: boolean;
}): Promise<ReactionBotTickResult> {
  const catchUp = options?.catchUp ?? true;
  const botIds = await getReactionBotIds();
  const botIdSet = new Set(botIds);
  const now = Date.now();
  const windowStart = new Date(now - POST_WINDOW_MS);

  if (botIds.length === 0) {
    return { scanned: 0, added: 0, bots: 0 };
  }

  const posts = await prisma.post.findMany({
    where: {
      hiddenAt: null,
      createdAt: { gte: windowStart },
      author: { ...seedAuthorFilter, isBanned: false },
    },
    select: {
      id: true,
      createdAt: true,
      _count: { select: { comments: true, reactions: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 120,
  });

  if (posts.length === 0) {
    return { scanned: 0, added: 0, bots: botIds.length };
  }

  const botCounts = await prisma.postReaction.groupBy({
    by: ['postId'],
    where: {
      postId: { in: posts.map((p) => p.id) },
      user: { email: { startsWith: 'seed-' } },
    },
    _count: { _all: true },
  });
  const botCountByPost = new Map(botCounts.map((r) => [r.postId, r._count._all]));

  const candidates: Candidate[] = [];

  for (const post of posts) {
    const ageMs = now - post.createdAt.getTime();
    if (ageMs < FIRST_REACT_AFTER_MS) continue;

    const bot = botCountByPost.get(post.id) ?? 0;
    const human = Math.max(0, post._count.reactions - bot);
    const trending = human >= 3 || post._count.comments >= 2 || human + bot >= 8;
    const target = trending ? TRENDING_TARGET : BASELINE_TARGET;
    let expected = expectedBotReactionsByNow(target, ageMs);

    // Posts that sat empty too long get a floor so they never stay at 0.
    if (bot === 0 && ageMs >= 8 * 60 * 1000) {
      expected = Math.max(expected, 6);
    }
    if (ageMs >= 6 * 60 * 60 * 1000) {
      expected = Math.max(expected, Math.round(target * 0.45));
    }
    if (ageMs >= 12 * 60 * 60 * 1000) {
      expected = Math.max(expected, Math.round(target * 0.7));
    }

    const deficit = expected - bot;
    if (deficit <= 0) continue;

    candidates.push({
      postId: post.id,
      deficit,
      reactedBotIds: new Set(),
    });
  }

  if (candidates.length === 0) {
    return { scanned: posts.length, added: 0, bots: botIds.length };
  }

  candidates.sort((a, b) => b.deficit - a.deficit);

  const maxAdds = catchUp ? 48 : 10;
  let added = 0;
  let spiked: string | null = null;

  for (const chosen of candidates) {
    if (added >= maxAdds) break;
    chosen.reactedBotIds = await botsAlreadyOnPost(chosen.postId, botIdSet);
    const remaining = Math.min(
      chosen.deficit,
      botIds.length - chosen.reactedBotIds.size,
      catchUp ? 12 : 6,
      maxAdds - added,
    );
    if (remaining <= 0) continue;
    const chunk = await addReactionsToPost(chosen, botIds, remaining);
    if (chunk > 0 && !spiked) spiked = chosen.postId;
    added += chunk;
  }

  return { scanned: posts.length, added, bots: botIds.length, spiked };
}
