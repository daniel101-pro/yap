import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getFatsomaEventListingOptions, parseFatsomaEventId } from '@/lib/exeter-events';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const ip = getClientIp(_request);
  const limit = checkRateLimit(`event-listing-options:${ip}`, 40, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const { eventId } = await context.params;
  if (!parseFatsomaEventId(eventId)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
  }

  const listing = await getFatsomaEventListingOptions(eventId);
  if (!listing) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json({ listing });
}
