import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { fetchMnoEvents, mnoEventsForVenuePin } from '@/lib/mynightout';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const venue = request.nextUrl.searchParams.get('venue')?.trim() ?? '';

  try {
    const all = await fetchMnoEvents();
    const events = venue ? mnoEventsForVenuePin(all, venue) : all;
    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ error: 'Could not load events' }, { status: 502 });
  }
}
