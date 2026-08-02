import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';

export async function GET() {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.blockedUser.findMany({
    where: { blockerId: user.id },
    orderBy: { createdAt: 'desc' },
    include: { blocked: { select: { id: true, anonymousHandle: true } } },
  });

  return NextResponse.json({
    blocked: rows.map((r) => ({
      id: r.blocked.id,
      handle: r.blocked.anonymousHandle ?? 'Anonymous',
    })),
  });
}
