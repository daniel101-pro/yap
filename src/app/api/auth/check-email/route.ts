import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isExeterEmail } from '@/lib/auth-utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isExeterEmail(email)) {
      return NextResponse.json({ error: 'Must be an @exeter.ac.uk email' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const limit = checkRateLimit(`check-email:${ip}`, 30, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true } });

    return NextResponse.json({ hasPassword: Boolean(user?.passwordHash) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not check email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
