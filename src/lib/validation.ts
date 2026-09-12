import type { MarketCategory, PostCategory } from '@/types';

export const LIMITS = {
  postContent: 2000,
  comment: 1000,
  message: 2000,
  listingTitle: 80,
  listingDescription: 2000,
  pinName: 80,
  pinAddress: 160,
  pinMapsQuery: 200,
  ticketTitle: 80,
  ticketVenue: 80,
  pollQuestion: 200,
  pollOption: 80,
  mediaItems: 6,
  pollOptions: 6,
  reportReason: 300,
  priceMax: 10_000,
  ticketQtyMax: 20,
} as const;

export const POST_CATEGORIES: readonly PostCategory[] = [
  'confessions',
  'hot-takes',
  'questions',
  'memes',
  'events',
  'rants',
  'advice',
];

export const MARKET_CATEGORIES: readonly MarketCategory[] = [
  'textbooks',
  'electronics',
  'furniture',
  'clothing',
  'bikes',
  'tickets',
  'other',
];

export const LISTING_CONDITIONS = ['new', 'like-new', 'good', 'fair'] as const;

export const TICKET_STATUSES = ['active', 'sold', 'reserved'] as const;

export function clampString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function parseBoundedNumber(
  value: unknown,
  min: number,
  max: number,
): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return n;
}

export function isPostCategory(value: unknown): value is PostCategory {
  return typeof value === 'string' && (POST_CATEGORIES as readonly string[]).includes(value);
}

export function isMarketCategory(value: unknown): value is MarketCategory {
  return typeof value === 'string' && (MARKET_CATEGORIES as readonly string[]).includes(value);
}

export function isListingCondition(
  value: unknown,
): value is (typeof LISTING_CONDITIONS)[number] {
  return typeof value === 'string' && (LISTING_CONDITIONS as readonly string[]).includes(value);
}

export function isTicketStatus(value: unknown): value is (typeof TICKET_STATUSES)[number] {
  return typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value);
}

const ALLOWED_MEDIA_HOST_SUFFIXES = [
  '.public.blob.vercel-storage.com',
  '.blob.vercel-storage.com',
];

export function isTrustedStripeRedirect(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'stripe.com' || host.endsWith('.stripe.com');
  } catch {
    return false;
  }
}

export function isAllowedMediaUrl(url: unknown): url is string {
  if (typeof url !== 'string' || url.length === 0 || url.length > 500) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'blob.vercel-storage.com' ||
      ALLOWED_MEDIA_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix))
    );
  } catch {
    return false;
  }
}

export function sanitizeMediaItems(value: unknown): { type: 'image' | 'video'; url: string }[] {
  if (!Array.isArray(value)) return [];
  const items: { type: 'image' | 'video'; url: string }[] = [];
  for (const raw of value.slice(0, LIMITS.mediaItems)) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { type?: unknown; url?: unknown };
    if (!isAllowedMediaUrl(item.url)) continue;
    items.push({
      type: item.type === 'video' ? 'video' : 'image',
      url: item.url,
    });
  }
  return items;
}

export function sanitizeImageUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isAllowedMediaUrl).slice(0, LIMITS.mediaItems);
}

export function sanitizePoll(body: {
  poll?: { question?: unknown; options?: unknown };
}): { question: string; options: { id: number; text: string; votes: number }[] } | null {
  const question = clampString(body.poll?.question, LIMITS.pollQuestion);
  if (!question) return null;
  const rawOptions = Array.isArray(body.poll?.options) ? body.poll.options : [];
  const options = rawOptions
    .slice(0, LIMITS.pollOptions)
    .map((opt, index) => {
      const text =
        typeof opt === 'string'
          ? clampString(opt, LIMITS.pollOption)
          : clampString((opt as { text?: unknown })?.text, LIMITS.pollOption);
      return { id: index, text, votes: 0 };
    })
    .filter((opt) => opt.text.length > 0);
  if (options.length < 2) return null;
  return { question, options };
}
