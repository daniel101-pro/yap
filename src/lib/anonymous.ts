import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export function generateAnonymousHandle(userId: string) {
  const secret = process.env.AUTH_SECRET ?? 'yap';
  const hash = createHash('sha256').update(`${userId}:${secret}`).digest('hex');
  return `Exe_${hash.slice(0, 6).toUpperCase()}`;
}

export async function ensureAnonymousHandle(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.anonymousHandle) return user.anonymousHandle;

  let handle = generateAnonymousHandle(userId);
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.user.findUnique({ where: { anonymousHandle: handle } });
    if (!existing) break;
    handle = `Exe_${generateAnonymousHandle(userId + String(attempts)).slice(4)}`;
    attempts += 1;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { anonymousHandle: handle },
  });

  return handle;
}
