import { NextRequest } from 'next/server';

interface Bucket {
  hits: number[];
}

// Per-instance in-memory sliding window. Good enough as a spam brake without
// new infra; does not share state across serverless instances, so treat it
// as a soft limit, not a hard security boundary.
const buckets = new Map<string, Bucket>();

// Periodically drop buckets that have gone quiet so this doesn't grow forever.
const MAX_BUCKETS = 20000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  consume = true,
): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size > MAX_BUCKETS) buckets.clear();
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    return { ok: false, retryAfterMs: windowMs - (now - oldest) };
  }

  if (consume) {
    bucket.hits.push(now);
  }
  return { ok: true, retryAfterMs: 0 };
}

export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }

  return 'unknown';
}
