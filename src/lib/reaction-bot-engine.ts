import { prisma } from '@/lib/prisma';
import type { Reaction } from '@/types';
import { getReactionBotIds, seedAuthorFilter } from '@/lib/seed-bots';

const FORTY_EIGHT_H_MS = 48 * 60 * 60 * 1000;
const POST_WINDOW_MS = 21 * 24 * 60 * 60 * 1000;
const FIRST_REACT_AFTER_MS = 90 * 1000;
const REACTIONS: Reaction[] = ['fire', 'cap', 'dead', 'real', 'sus'];

type Mix = Record<Reaction, number>;

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(seed: number, salt: number): number {
  return ((seed ^ Math.imul(salt, 0x9e3779b9)) >>> 0) / 4294967295;
}

function emptyMix(): Mix {
  return { fire: 0, cap: 0, dead: 0, real: 0, sus: 0 };
}

function mixKey(mix: Mix): string {
  return REACTIONS.map((r) => mix[r]).join(',');
}

function flattenMix(mix: Mix): Reaction[] {
  const out: Reaction[] = [];
  for (const r of REACTIONS) {
    for (let i = 0; i < mix[r]; i++) out.push(r);
  }
  return out;
}

/** Lifetime bot count unique to the post — wide spread, no shared floors. */
export function postLifetimeTarget(postId: string, trending: boolean): number {
  const u = unit(hash32(postId), 11);
  if (trending) return 28 + Math.floor(u * 31);
  return 3 + Math.floor(u * 29);
}

function shuffledReactions(seed: number): Reaction[] {
  const arr = [...REACTIONS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(unit(seed, 200 + i) * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/** High-entropy mix: different dominant emoji, different zeros, different totals. */
function composeMix(postId: string, total: number, salt: number): Mix {
  const n = Math.max(0, total);
  const mix = emptyMix();
  if (n === 0) return mix;

  const seed = hash32(`${postId}:${salt}`);
  const order = shuffledReactions(seed);
  const typeCount = Math.min(n, 2 + Math.floor(unit(seed, 3) * 3));
  const active = order.slice(0, Math.max(1, typeCount));
  const weights = active.map((_, i) => 0.35 + unit(seed, 11 + i * 19) * 5);
  const wsum = weights.reduce((a, b) => a + b, 0);

  let used = 0;
  for (let i = 0; i < active.length; i++) {
    const r = active[i]!;
    if (i === active.length - 1) {
      mix[r] = n - used;
      break;
    }
    const share = Math.round((weights[i]! / wsum) * n);
    mix[r] = Math.max(0, Math.min(share, n - used));
    used += mix[r];
  }
  return mix;
}

export function expectedBotReactionsByNow(target: number, ageMs: number, postId: string): number {
  if (ageMs < FIRST_REACT_AFTER_MS) return 0;
  const twoH = 2 * 60 * 60 * 1000;
  const early = Math.min(1, ageMs / twoH);
  const late = Math.min(1, ageMs / FORTY_EIGHT_H_MS);
  const curved = 0.38 * (1 - Math.exp(-3.1 * early)) + 0.62 * (1 - Math.exp(-2.1 * late));
  const drift = (unit(hash32(postId), 71) - 0.5) * 2;
  return Math.max(0, Math.round(target * curved + drift));
}

function uniqueMixesForPosts(
  posts: Array<{ id: string; expected: number }>,
): Map<string, Mix> {
  const used = new Set<string>();
  const assigned = new Map<string, Mix>();
  const sorted = [...posts].sort((a, b) => a.id.localeCompare(b.id));

  for (let i = 0; i < sorted.length; i++) {
    const post = sorted[i]!;
    let expected = Math.max(0, post.expected);
    let mix = composeMix(post.id, expected, i);
    let n = 0;
    while (expected > 0 && used.has(mixKey(mix)) && n < 60) {
      n += 1;
      expected = Math.max(2, post.expected + ((n % 7) - 3));
      mix = composeMix(post.id, expected, i + n * 17);
    }
    used.add(mixKey(mix));
    assigned.set(post.id, mix);
  }

  return assigned;
}

function currentMix(rows: Array<{ reaction: string }>): Mix {
  const mix = emptyMix();
  for (const row of rows) {
    if (REACTIONS.includes(row.reaction as Reaction)) {
      mix[row.reaction as Reaction] += 1;
    }
  }
  return mix;
}

type BotRow = { id: string; postId: string; userId: string; reaction: string; createdAt: Date };

async function applyBotMix(
  postId: string,
  target: Mix,
  botIds: string[],
  rows: BotRow[],
): Promise<{ added: number; changed: number }> {
  const desired = flattenMix(target);
  const want = desired.length;
  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  let added = 0;
  let changed = 0;

  if (sorted.length > want) {
    await prisma.postReaction.deleteMany({
      where: { id: { in: sorted.slice(want).map((r) => r.id) } },
    });
    sorted.length = want;
  }

  const updates: Array<{ id: string; reaction: Reaction }> = [];
  for (let i = 0; i < sorted.length; i++) {
    const next = desired[i]!;
    if (sorted[i]!.reaction !== next) {
      updates.push({ id: sorted[i]!.id, reaction: next });
    }
  }

  for (let i = 0; i < updates.length; i += 20) {
    const chunk = updates.slice(i, i + 20);
    await Promise.all(
      chunk.map((u) =>
        prisma.postReaction.update({ where: { id: u.id }, data: { reaction: u.reaction } }),
      ),
    );
    changed += chunk.length;
  }

  const missing = want - sorted.length;
  if (missing <= 0) return { added, changed };

  const usedBots = new Set(sorted.map((r) => r.userId));
  const ranked = [...botIds].sort(
    (a, b) => hash32(`${postId}:${a}`) - hash32(`${postId}:${b}`),
  );
  const fresh: Array<{ postId: string; userId: string; reaction: Reaction }> = [];
  for (const userId of ranked) {
    if (fresh.length >= missing) break;
    if (usedBots.has(userId)) continue;
    usedBots.add(userId);
    fresh.push({
      postId,
      userId,
      reaction: desired[sorted.length + fresh.length]!,
    });
  }

  if (fresh.length > 0) {
    await prisma.postReaction.createMany({ data: fresh, skipDuplicates: true });
    added += fresh.length;
  }

  return { added, changed };
}

export type ReactionBotTickResult = {
  scanned: number;
  added: number;
  bots: number;
  remixed?: number;
  spiked?: string | null;
};

export async function runReactionBotTick(options?: {
  catchUp?: boolean;
}): Promise<ReactionBotTickResult> {
  const catchUp = options?.catchUp ?? true;
  const botIds = await getReactionBotIds();
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
    take: 80,
  });

  if (posts.length === 0) {
    return { scanned: 0, added: 0, bots: botIds.length };
  }

  const botRows = await prisma.postReaction.findMany({
    where: {
      postId: { in: posts.map((p) => p.id) },
      user: { email: { startsWith: 'seed-' } },
    },
    select: { id: true, postId: true, userId: true, reaction: true, createdAt: true },
  });

  const rowsByPost = new Map<string, BotRow[]>();
  for (const row of botRows) {
    const list = rowsByPost.get(row.postId) ?? [];
    list.push(row);
    rowsByPost.set(row.postId, list);
  }

  const plans: Array<{ id: string; expected: number }> = [];
  for (const post of posts) {
    const ageMs = now - post.createdAt.getTime();
    if (ageMs < FIRST_REACT_AFTER_MS) continue;
    const bot = rowsByPost.get(post.id)?.length ?? 0;
    const human = Math.max(0, post._count.reactions - bot);
    const trending = human >= 3 || post._count.comments >= 2;
    const target = postLifetimeTarget(post.id, trending);
    const expected = expectedBotReactionsByNow(target, ageMs, post.id);
    plans.push({ id: post.id, expected });
  }

  const unique = uniqueMixesForPosts(plans);
  const limit = catchUp ? 80 : 24;
  let added = 0;
  let remixed = 0;
  let spiked: string | null = null;
  let processed = 0;

  for (const plan of plans) {
    if (processed >= limit) break;
    const targetMix = unique.get(plan.id);
    if (!targetMix) continue;
    const rows = rowsByPost.get(plan.id) ?? [];
    if (mixKey(currentMix(rows)) === mixKey(targetMix)) continue;

    processed += 1;
    const result = await applyBotMix(plan.id, targetMix, botIds, rows);
    added += result.added;
    remixed += result.changed;
    if (!spiked && (result.added > 0 || result.changed > 0)) spiked = plan.id;
  }

  return { scanned: posts.length, added, bots: botIds.length, remixed, spiked };
}
