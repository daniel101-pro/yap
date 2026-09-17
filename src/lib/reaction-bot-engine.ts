import { prisma } from '@/lib/prisma';
import type { Reaction } from '@/types';
import { ensureSeedBots, isSeedEmail, seedAuthorFilter } from '@/lib/seed-bots';

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;
const POST_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
const BASELINE_TARGET = 24;
const TRENDING_TARGET = 50;
const FIRST_REACT_AFTER_MS = 2 * 60 * 1000;

const REACTION_POOL: Reaction[] = ['fire', 'fire', 'real', 'dead', 'real', 'cap', 'sus'];

function pickReaction(): Reaction {
  return REACTION_POOL[Math.floor(Math.random() * REACTION_POOL.length)]!;
}

/** Slow overnight fill, but enough early reactions that the feed actually moves. */
export function expectedBotReactionsByNow(target: number, ageMs: number): number {
  if (ageMs < FIRST_REACT_AFTER_MS) return 0;
  const twoH = 2 * 60 * 60 * 1000;
  const early = Math.min(1, ageMs / twoH);
  const late = Math.min(1, ageMs / FORTY_EIGHT_H_MS);
  const curved = 0.42 * (1 - Math.exp(-3.4 * early)) + 0.58 * (1 - Math.exp(-2.3 * late));
  const jitter = (Math.random() - 0.25) * 2.4;
  return Math.max(0, Math.round(target * curved + jitter));
}

function countReactions(post: {
  reactions: { user: { email: string | null } }[];
}): { human: number; bot: number } {
  let human = 0;
  let bot = 0;
  for (const r of post.reactions) {
    if (isSeedEmail(r.user.email)) bot += 1;
    else human += 1;
  }
  return { human, bot };
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
  weight: number;
  reactedBotIds: Set<string>;
};

function pickWeighted(candidates: Candidate[]): Candidate | null {
  const totalWeight = candidates.reduce((s, c) => s + Math.max(0, c.weight), 0);
  if (totalWeight <= 0 || candidates.length === 0) return null;
  let roll = Math.random() * totalWeight;
  for (const c of candidates) {
    roll -= Math.max(0, c.weight);
    if (roll <= 0) return c;
  }
  return candidates[candidates.length - 1] ?? null;
}

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
  chosen.weight = Math.pow(Math.max(0, chosen.deficit), 1.25) * (0.4 + Math.random());
  return added;
}

/** Drip bot reactions — small random bursts, not a dump. */
export async function runReactionBotTick(options?: {
  catchUp?: boolean;
}): Promise<ReactionBotTickResult> {
  const catchUp = Boolean(options?.catchUp);
  const botIds = await ensureSeedBots();
  const now = Date.now();
  const windowStart = new Date(now - POST_WINDOW_MS);

  const posts = await prisma.post.findMany({
    where: {
      hiddenAt: null,
      createdAt: { gte: windowStart },
      author: { ...seedAuthorFilter, isBanned: false },
    },
    include: {
      reactions: { include: { user: { select: { id: true, email: true } } } },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 180,
  });

  if (posts.length === 0 || botIds.length === 0) {
    return { scanned: posts.length, added: 0, bots: botIds.length };
  }

  if (!catchUp && Math.random() < 0.1) {
    return { scanned: posts.length, added: 0, bots: botIds.length };
  }

  const humanScores = posts.map((p) => countReactions(p).human + p._count.comments * 2);
  const sortedHumans = [...humanScores].sort((a, b) => b - a);
  const trendingFloor = sortedHumans[Math.floor(sortedHumans.length * 0.12)] ?? 4;

  const candidates: Candidate[] = [];

  for (const post of posts) {
    const ageMs = now - post.createdAt.getTime();
    if (ageMs < FIRST_REACT_AFTER_MS) continue;

    const { human, bot } = countReactions(post);
    const reactedBotIds = new Set(
      post.reactions.filter((r) => isSeedEmail(r.user.email)).map((r) => r.user.id),
    );

    const trending =
      human >= Math.max(3, trendingFloor) || post._count.comments >= 2 || human + bot >= 8;
    const target = trending ? TRENDING_TARGET : BASELINE_TARGET;
    const expected = expectedBotReactionsByNow(target, ageMs);
    const deficit = expected - bot;
    if (deficit <= 0) continue;

    const recencyBoost = ageMs < 6 * 60 * 60 * 1000 ? 1.8 : 1;
    const weight = Math.pow(deficit, 1.2) * recencyBoost * (0.4 + Math.random());
    candidates.push({ postId: post.id, deficit, weight, reactedBotIds });
  }

  if (candidates.length === 0) {
    return { scanned: posts.length, added: 0, bots: botIds.length };
  }

  let added = 0;
  let spiked: string | null = null;

  if (catchUp) {
    const maxAdds = 28 + Math.floor(Math.random() * 12);
    while (added < maxAdds && candidates.length > 0) {
      const chosen = pickWeighted(candidates);
      if (!chosen) break;
      const chunk = Math.min(chosen.deficit, 1 + Math.floor(Math.random() * 2));
      added += await addReactionsToPost(chosen, botIds, chunk);
      if (chosen.deficit <= 0) {
        const idx = candidates.indexOf(chosen);
        if (idx >= 0) candidates.splice(idx, 1);
      }
    }
  } else if (Math.random() < 0.48) {
    const chosen = pickWeighted(candidates);
    if (chosen) {
      const burst = Math.min(chosen.deficit, 3 + Math.floor(Math.random() * 5));
      added += await addReactionsToPost(chosen, botIds, burst);
      spiked = chosen.postId;
    }
  } else {
    const sprinkle = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sprinkle; i++) {
      const chosen = pickWeighted(candidates.filter((c) => c.deficit > 0));
      if (!chosen) break;
      added += await addReactionsToPost(chosen, botIds, 1);
    }
  }

  return { scanned: posts.length, added, bots: botIds.length, spiked };
}
