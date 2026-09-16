const MNO_API = 'https://api.mynightout.app/v4';

const FETCH_HEADERS: HeadersInit = {
  Accept: 'application/json',
  'User-Agent': 'YAP/1.0 (Exeter student marketplace)',
};

export type MnoVenue = {
  id: string;
  name: string;
  gps?: { lat: number; lon: number };
};

export type MnoEventSummary = {
  id: string;
  name: string;
  type: string;
  image?: string;
  description?: string;
  openTime?: number;
  closeTime?: number;
  venue?: MnoVenue;
};

export type MnoTicketSlot = {
  id: string;
  name: string;
  position: number;
  availability: 'on_sale' | 'sold_out' | string;
  metadata?: string[];
  price?: {
    basePrice?: { pennies: number; value: number; formatted: string };
    total?: { pennies: number; value: number; formatted: string };
  };
};

export type MnoEventDetail = MnoEventSummary & {
  tickets: MnoTicketSlot[];
};

async function mnoFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${MNO_API}${path}`, {
    headers: FETCH_HEADERS,
    next: { revalidate: 120 },
  });
  if (!res.ok) {
    throw new Error(`MyNightOut ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchMnoEvents(): Promise<MnoEventSummary[]> {
  const data = await mnoFetch<MnoEventSummary[] | { events?: MnoEventSummary[] }>('/events');
  if (Array.isArray(data)) return data;
  return Array.isArray(data.events) ? data.events : [];
}

export async function fetchMnoEvent(eventId: string): Promise<MnoEventSummary | null> {
  try {
    return await mnoFetch<MnoEventSummary>(`/events/${encodeURIComponent(eventId)}`);
  } catch {
    return null;
  }
}

export async function fetchMnoEventTickets(eventId: string): Promise<MnoTicketSlot[]> {
  try {
    const data = await mnoFetch<{ tickets?: MnoTicketSlot[] }>(
      `/events/${encodeURIComponent(eventId)}/tickets`,
    );
    const rows = Array.isArray(data.tickets) ? data.tickets : [];
    return rows.sort((a, b) => a.position - b.position);
  } catch {
    return [];
  }
}

export async function fetchMnoEventDetail(eventId: string): Promise<MnoEventDetail | null> {
  const [event, tickets] = await Promise.all([
    fetchMnoEvent(eventId),
    fetchMnoEventTickets(eventId),
  ]);
  if (!event) return null;
  return { ...event, tickets };
}

/** Match seed map pin names to MyNightOut venue labels. */
export function mnoEventsForVenuePin(
  events: MnoEventSummary[],
  pinName: string,
): MnoEventSummary[] {
  const pin = pinName.trim().toLowerCase();
  if (!pin) return [];

  return events
    .filter((ev) => {
      const venueName = ev.venue?.name?.toLowerCase() ?? '';
      if (!venueName) return false;
      if (venueName.includes(pin) || pin.includes(venueName.split(/\s+/)[0] ?? '')) return true;
      if (pin === 'timepiece' && venueName.includes('timepiece')) return true;
      if (pin === 'arena' && venueName.includes('arena')) return true;
      if (pin === 'move' && venueName.includes('move')) return true;
      if (pin === 'bomba' && venueName.includes('bomba')) return true;
      if (pin === 'phoenix' && venueName.includes('phoenix')) return true;
      return false;
    })
    .sort((a, b) => (a.openTime ?? 0) - (b.openTime ?? 0));
}

export function formatMnoInstant(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function normalizeSlotName(name: string): string {
  return name.replace(/\s+/g, ' ').trim().toLowerCase();
}

const SEARCH_ALIASES: Record<string, string[]> = {
  tp: ['timepiece'],
  time: ['timepiece'],
  piece: ['timepiece'],
};

export function mnoEventMatchesSearch(ev: MnoEventSummary, rawQuery: string): boolean {
  const tokens = rawQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const hay = `${ev.name} ${ev.venue?.name ?? ''}`.toLowerCase();

  return tokens.every((token) => {
    if (hay.includes(token)) return true;
    for (const alias of SEARCH_ALIASES[token] ?? []) {
      if (hay.includes(alias)) return true;
    }
    return false;
  });
}
