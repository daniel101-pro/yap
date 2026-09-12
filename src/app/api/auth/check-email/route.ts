import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isExeterEmail, normalizeEmail } from '@/lib/auth-utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { publicErrorMessage } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';

    if (!isExeterEmail(email)) {
      return NextResponse.json({ error: 'Must be an @exeter.ac.uk email' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`check-email:ip:${ip}`, 15, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(ipLimit.retryAfterMs / 1000)) } },
      );
    }

    const emailLimit = checkRateLimit(`check-email:email:${email}`, 8, 10 * 60 * 1000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true, isBanned: true },
    });

    return NextResponse.json({
      hasPassword: Boolean(user?.passwordHash) && !user?.isBanned,
    });
  } catch {
    return NextResponse.json(
      { error: publicErrorMessage(null, 'Could not check email') },
      { status: 500 },
    );
  }
}
