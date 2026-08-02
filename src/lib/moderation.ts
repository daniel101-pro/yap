import { prisma } from '@/lib/prisma';

const AUTO_HIDE_THRESHOLD = 3;

export type ReportTargetType = 'post' | 'comment';

export async function fileReport(
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
) {
  await prisma.report.upsert({
    where: { reporterId_targetType_targetId: { reporterId, targetType, targetId } },
    update: {},
    create: { reporterId, targetType, targetId, reason: reason.slice(0, 300) },
  });

  const count = await prisma.report.count({ where: { targetType, targetId } });
  if (count < AUTO_HIDE_THRESHOLD) return { hidden: false };

  if (targetType === 'post') {
    await prisma.post.updateMany({
      where: { id: targetId, hiddenAt: null },
      data: { hiddenAt: new Date() },
    });
  } else {
    await prisma.comment.updateMany({
      where: { id: targetId, hiddenAt: null },
      data: { hiddenAt: new Date() },
    });
  }

  return { hidden: true };
}

export async function blockUser(blockerId: string, blockedId: string) {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }
  await prisma.blockedUser.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
}

export async function getBlockedAuthorIds(userId: string): Promise<string[]> {
  const rows = await prisma.blockedUser.findMany({
    where: { blockerId: userId },
    select: { blockedId: true },
  });
  return rows.map((r) => r.blockedId);
}
