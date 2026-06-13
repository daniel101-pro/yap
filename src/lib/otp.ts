import { createHash, randomInt } from 'crypto';

const OTP_TTL_MS = 10 * 60 * 1000;

export function generateOtpCode() {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(email: string, code: string) {
  const secret = process.env.AUTH_SECRET ?? '';
  return createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex');
}

export function getOtpExpiry() {
  return new Date(Date.now() + OTP_TTL_MS);
}
