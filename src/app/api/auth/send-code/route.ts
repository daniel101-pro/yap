import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isExeterEmail } from '@/lib/auth-utils';
import { generateOtpCode, hashOtp, getOtpExpiry, OTP_TTL_MS, OTP_RESEND_COOLDOWN_MS } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isExeterEmail(email)) {
      return NextResponse.json({ error: 'Must be an @exeter.ac.uk email' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const ipLimit = checkRateLimit(`send-code:ip:${ip}`, 10, 10 * 60 * 1000);
    if (!ipLimit.ok) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again shortly.' },
        { status: 429 },
      );
    }

    const emailLimit = checkRateLimit(`send-code:email:${email}`, 5, 10 * 60 * 1000);
    if (!emailLimit.ok) {
      return NextResponse.json(
        { error: 'Too many codes requested for this email. Please wait a bit.' },
        { status: 429 },
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

    const code = generateOtpCode();
    const hashed = hashOtp(email, code);
    const expires = getOtpExpiry();

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: { identifier: email, token: hashed, expires },
    });

    await sendVerificationEmail(email, code);

    return NextResponse.json({ ok: true, message: 'Verification code sent' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
