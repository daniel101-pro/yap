import { prisma } from '@/lib/prisma';
import type { Reaction } from '@/types';
import { ensureSeedBots, isSeedEmail, seedAuthorFilter } from '@/lib/seed-bots';

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;
const POST_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const BASELINE_TARGET = 24;
const TRENDING_TARGET = 50;

const REACTION_POOL: Reaction[] = ['fire', 'fire', 'real', 'dead', 'real', 'cap', 'sus'];

function pickReaction(): Reaction {
  return REACTION_POOL[Math.floor(Math.random() * REACTION_POOL.length)]!;
}

/** How many bot reactions we expect by now (slow start, fills in over ~48h). */
export function expectedBotReactionsByNow(target: number, ageMs: number): number {
  const progress = Math.min(1, Math.max(0, ageMs / FORTY_EIGHT_H_MS));
  const curved = 1 - Math.exp(-2.4 * progress);
  const jitter = (Math.random() - 0.5) * 1.5;
  return Math.max(0, Math.floor(target * curved + jitter));
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
};

/** Drip bot reactions across posts — a few per run, unpredictable timing. */
export async function runReactionBotTick(): Promise<ReactionBotTickResult> {
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

  if (posts.length === 0) {
    return { scanned: 0, added: 0, bots: botIds.length };
  }

  const humanScores = posts.map((p) => countReactions(p).human + p._count.comments * 2);
  const sortedHumans = [...humanScores].sort((a, b) => b - a);
  const trendingFloor = sortedHumans[Math.floor(sortedHumans.length * 0.12)] ?? 4;

  type Candidate = {
    postId: string;
    deficit: number;
    weight: number;
    reactedBotIds: Set<string>;
  };

  const candidates: Candidate[] = [];

  for (const post of posts) {
    const ageMs = now - post.createdAt.getTime();
    if (ageMs < 90_000) continue;

    const { human, bot } = countReactions(post);
    const reactedBotIds = new Set(
      post.reactions.filter((r) => isSeedEmail(r.user.email)).map((r) => r.user.id),
    );

    const trending =
      human >= Math.max(5, trendingFloor) || post._count.comments >= 3 || human + bot >= 12;
    const target = trending ? TRENDING_TARGET : BASELINE_TARGET;
    const expected = expectedBotReactionsByNow(target, ageMs);
    const deficit = expected - bot;
    if (deficit <= 0) continue;

    const weight = Math.pow(deficit, 1.35) * (0.35 + Math.random());
    candidates.push({ postId: post.id, deficit, weight, reactedBotIds });
  }

  if (candidates.length === 0) {
    return { scanned: posts.length, added: 0, bots: botIds.length };
  }

  const maxAdds = 3 + Math.floor(Math.random() * 4);
  let added = 0;

  for (let n = 0; n < maxAdds; n++) {
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    if (totalWeight <= 0) break;

    let roll = Math.random() * totalWeight;
    let chosen = candidates[0]!;
    for (const c of candidates) {
      roll -= c.weight;
      if (roll <= 0) {
        chosen = c;
        break;
      }
    }

    const availableBots = botIds.filter((id) => !chosen.reactedBotIds.has(id));
    if (availableBots.length === 0) {
      const idx = candidates.indexOf(chosen);
      if (idx >= 0) candidates.splice(idx, 1);
      continue;
    }

    const userId = availableBots[Math.floor(Math.random() * availableBots.length)]!;
    const reaction = pickReaction();

    try {
      await prisma.postReaction.create({
        data: { postId: chosen.postId, userId, reaction },
      });
      added += 1;
      chosen.reactedBotIds.add(userId);
      chosen.deficit -= 1;
      chosen.weight = Math.pow(Math.max(0, chosen.deficit), 1.35) * (0.35 + Math.random());
      if (chosen.deficit <= 0) {
        const idx = candidates.indexOf(chosen);
        if (idx >= 0) candidates.splice(idx, 1);
      }
    } catch {
      chosen.reactedBotIds.add(userId);
    }
  }

  return { scanned: posts.length, added, bots: botIds.length };
}
