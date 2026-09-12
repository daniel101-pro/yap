import { prisma } from '@/lib/prisma';

export async function awardKarma(userId: string, amount: number) {
  if (amount <= 0) return;
  await prisma.user.update({
    where: { id: userId },
    data: { karma: { increment: amount } },
  });
}
