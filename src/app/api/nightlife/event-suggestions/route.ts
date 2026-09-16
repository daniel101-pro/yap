import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { FIXR_EXETER_URL, searchExeterEventSuggestions } from '@/lib/exeter-events';
import { matchingVenuesForSearch } from '@/lib/exeter-venues';
import { clampString, LIMITS } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(`event-suggestions:${ip}`, 60, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const q = clampString(request.nextUrl.searchParams.get('q') ?? '', LIMITS.ticketTitle);
  const suggestions = await searchExeterEventSuggestions(q);
  const fixrVenues = matchingVenuesForSearch(q).filter((v) => v.fixrShopId);

  return NextResponse.json({
    suggestions,
    fixrUrl: FIXR_EXETER_URL,
    fixrVenues: fixrVenues.map((v) => ({
      name: v.displayVenue,
      shopId: v.fixrShopId,
    })),
    sources: ['fatsoma', 'fixr'],
  });
}
