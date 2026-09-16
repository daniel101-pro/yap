import { prisma } from '@/lib/prisma';
import type { Reaction } from '@/types';

/** Demo accounts — reactions only, never shown in feed as authors. */
const SEED_BOTS = [
  { email: 'seed-system@exeter.ac.uk', handle: 'CampusGhost' },
  { email: 'seed-bot-1@exeter.ac.uk', handle: 'ForumLegend' },
  { email: 'seed-bot-2@exeter.ac.uk', handle: 'StreathamSoul' },
  { email: 'seed-bot-3@exeter.ac.uk', handle: 'LibraryRat' },
  { email: 'seed-bot-4@exeter.ac.uk', handle: 'RamenEnjoyer' },
  { email: 'seed-bot-5@exeter.ac.uk', handle: 'FreshersFriend' },
] as const;

const REACTION_POOL: Reaction[] = ['fire', 'fire', 'real', 'dead', 'real'];

export function isSeedEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().startsWith('seed-'));
}

export const seedAuthorFilter = {
  email: { not: { startsWith: 'seed-' } },
} as const;

/** Ensure seed bot users exist (no posts — reactions only). */
export async function ensureSeedBots(): Promise<string[]> {
  const ids: string[] = [];

  for (const bot of SEED_BOTS) {
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
    ids.push(user.id);
  }

  return ids;
}

/** Add a few anonymous reactions from seed bots on real student posts. */
export async function sprinkleSeedReactions(postId: string): Promise<void> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: { select: { email: true } } },
  });

  if (!post || post.hiddenAt || isSeedEmail(post.author.email)) return;

  const botIds = await ensureSeedBots();
  const reactionCount = 2 + Math.floor(Math.random() * 4);
  const picked = [...botIds].sort(() => Math.random() - 0.5).slice(0, reactionCount);

  await Promise.all(
    picked.map((userId) => {
      const reaction = REACTION_POOL[Math.floor(Math.random() * REACTION_POOL.length)];
      return prisma.postReaction.upsert({
        where: { postId_userId: { postId, userId } },
        create: { postId, userId, reaction },
        update: {},
      });
    }),
  );
}
