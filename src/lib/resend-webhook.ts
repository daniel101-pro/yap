import { createHmac, timingSafeEqual } from 'crypto';

const MAX_SKEW_SECONDS = 5 * 60;

function decodeWebhookSecret(secret: string): Buffer {
  const trimmed = secret.trim();
  const raw = trimmed.startsWith('whsec_') ? trimmed.slice(6) : trimmed;
  try {
    return Buffer.from(raw, 'base64');
  } catch {
    return Buffer.from(raw);
  }
}

export function getResendWebhookSecret(): string | null {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  return secret || null;
}

/** Verify a Resend (Svix) webhook signature against the raw body. */
export function verifyResendWebhook(payload: string, headers: Headers, secret: string): boolean {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signatureHeader = headers.get('svix-signature');
  if (!id || !timestamp || !signatureHeader) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > MAX_SKEW_SECONDS) {
    return false;
  }

  const key = decodeWebhookSecret(secret);
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${payload}`).digest('base64');
  const expectedBuf = Buffer.from(expected);

  return signatureHeader.split(' ').some((part) => {
    const sig = part.replace(/^v1,/, '').trim();
    if (!sig) return false;
    try {
      const given = Buffer.from(sig);
      return given.length === expectedBuf.length && timingSafeEqual(given, expectedBuf);
    } catch {
      return false;
    }
  });
}
