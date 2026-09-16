import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isExeterEmail, normalizeEmail } from '@/lib/auth-utils';
import { generateOtpCode, hashOtp, getOtpExpiry, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { publicErrorMessage } from '@/lib/security';
import { isSeedEmail } from '@/lib/seed-bots';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';

    if (!isExeterEmail(email) || isSeedEmail(email)) {
      return NextResponse.json({ error: 'Must be an @exeter.ac.uk email' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`send-code:ip:${ip}`, 10, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(ipLimit.retryAfterMs / 1000)) } },
      );
    }

    const emailLimit = checkRateLimit(`send-code:email:${email}`, 5, 10 * 60 * 1000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: 'Too many codes requested for this email. Please wait a bit.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(emailLimit.retryAfterMs / 1000)) } },
      );
    }

    const existingToken = await prisma.verificationToken.findFirst({
      where: { identifier: email },
      orderBy: { expires: 'desc' },
    });
    if (existingToken) {
      const issuedAt = existingToken.expires.getTime() - OTP_TTL_MS;
      const elapsed = Date.now() - issuedAt;
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        return NextResponse.json(
          { error: 'A code was just sent. Please wait before requesting another.' },
          { status: 429 },
        );
      }
    }

    const banned = await prisma.user.findUnique({
      where: { email },
      select: { isBanned: true },
    });
    if (banned?.isBanned) {
      return NextResponse.json({ ok: true, message: 'Verification code sent' });
    }

    const code = generateOtpCode();
    const hashed = hashOtp(email, code);
    const expires = getOtpExpiry();

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token: hashed, expires },
    });

    await sendVerificationEmail(email, code);

    return NextResponse.json({ ok: true, message: 'Verification code sent' });
  } catch {
    return NextResponse.json(
      { error: publicErrorMessage(null, 'Could not send code') },
      { status: 500 },
    );
  }
}
