import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth-session';
import { fileReport } from '@/lib/moderation';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`report:${user.id}`, 20, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many reports. Please slow down.' }, { status: 429 });
  }

  const { id } = await params;
  const comment = await prisma.comment.findUnique({ where: { id }, select: { id: true } });
  if (!comment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  await fileReport(user.id, 'comment', id, reason);

  return NextResponse.json({ ok: true });
}
