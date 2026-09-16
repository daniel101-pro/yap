import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { fetchMnoEventDetail } from '@/lib/mynightout';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!eventId?.trim()) {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 });
  }

  try {
    const event = await fetchMnoEventDetail(eventId.trim());
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: 'Could not load event' }, { status: 502 });
  }
}
