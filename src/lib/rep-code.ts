import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

function normalizeRepCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
}

function randomRepCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function ensureUserRepCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { repCode: true, anonymousHandle: true },
  });
  if (!user) throw new Error('User not found');
  if (user.repCode) return user.repCode;

  const candidates = [
    user.anonymousHandle ? normalizeRepCode(user.anonymousHandle) : '',
    randomRepCode(),
    randomRepCode(),
  ].filter((c) => c.length >= 4);

  for (const code of candidates) {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { repCode: code },
        select: { repCode: true },
      });
      return updated.repCode!;
    } catch {
      // unique collision — try next
    }
  }

  const fallback = randomRepCode();
  await prisma.user.update({ where: { id: userId }, data: { repCode: fallback } });
  return fallback;
}

export async function repCodeUseCount(sellerId: string): Promise<number> {
  return prisma.repCodeUse.count({ where: { sellerId } });
}

export async function recordRepCodeUse(sellerId: string, ticketId?: string) {
  await prisma.repCodeUse.create({
    data: { sellerId, ticketId: ticketId ?? null },
  });
}

export async function resolveSellerIdFromRepCode(code: string): Promise<string | null> {
  const normalized = normalizeRepCode(code.trim());
  if (normalized.length < 4) return null;
  const user = await prisma.user.findFirst({
    where: { repCode: normalized },
    select: { id: true },
  });
  return user?.id ?? null;
}
