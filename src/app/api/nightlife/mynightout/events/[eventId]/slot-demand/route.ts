import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { fetchMnoEventTickets } from '@/lib/mynightout';
import { getEventSlotDemand } from '@/lib/nightlife-slot-demand-server';

type RouteContext = { params: Promise<{ eventId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { eventId } = await context.params;
  const id = eventId?.trim();
  if (!id) {
    return NextResponse.json({ error: 'Missing event' }, { status: 400 });
  }

  try {
    const tickets = await fetchMnoEventTickets(id);
    const order = tickets.map((t) => t.id);
    const demand = await getEventSlotDemand(id, order);
    return NextResponse.json(demand);
  } catch {
    return NextResponse.json({ error: 'Could not load demand' }, { status: 502 });
  }
}
