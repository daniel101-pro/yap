import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isExeterEmail } from '@/lib/auth-utils';
import { generateOtpCode, hashOtp, getOtpExpiry } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!isExeterEmail(email)) {
      return NextResponse.json({ error: 'Must be an @exeter.ac.uk email' }, { status: 400 });
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
