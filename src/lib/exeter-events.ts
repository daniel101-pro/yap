import type { EventListingOptions, EventSuggestion, EventTicketType } from '@/types';
import { matchingVenuesForSearch } from '@/lib/exeter-venues';

const EXETER_CENTER = { lat: 50.718, lng: -3.533 };
const FATSOMA = 'https://api.fatsoma.com/v1';
const CACHE_MS = 60 * 60 * 1000;

type FatsomaLocation = {
  name?: string;
  city?: string;
  country?: string;
  address?: string;
  'postal-code'?: string;
  latitude?: number;
  longitude?: number;
};

type FatsomaEvent = {
  type: string;
  id: string;
  attributes: {
    name?: string;
    'vanity-name'?: string;
    expired?: boolean;
    'starts-at'?: string;
    'price-max-with-fees'?: number;
    'price-max'?: number;
  } & Record<string, unknown>;
  relationships?: {
    location?: { data?: { id?: string } };
  };
};

let cached: { expiresAt: number; items: EventSuggestion[] } | null = null;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function isExeterUk(loc: FatsomaLocation | undefined): boolean {
  if (!loc) return false;
  if (loc.country && loc.country !== 'United Kingdom') return false;

  const city = (loc.city || '').toLowerCase();
  if (city === 'exeter') return true;

  const postcode = (loc['postal-code'] || '').toUpperCase();
  if (/^EX[0-9]/.test(postcode)) return true;

  const lat = loc.latitude;
  const lng = loc.longitude;
  if (typeof lat === 'number' && typeof lng === 'number') {
    return haversineKm(EXETER_CENTER, { lat, lng }) <= 18;
  }

  const address = (loc.address || '').toLowerCase();
  return /exeter/.test(address) && /(\bex[0-9]|united kingdom|uk\b)/i.test(loc.address || '');
}

function fatsomaEventUrl(vanity?: string) {
  if (!vanity) return 'https://www.fatsoma.com/e/exeter';
  return `https://www.fatsoma.com/e/${vanity}/`;
}

async function fetchFatsomaNameSearch(name: string, maxPages = 2): Promise<EventSuggestion[]> {
  const out: EventSuggestion[] = [];
  const locById = new Map<string, FatsomaLocation>();
  const now = Date.now();

  let remoteCount = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const params = new URLSearchParams({
      'filter[name]': name,
      per_page: '50',
      'page[number]': String(page),
      include: 'location',
    });
    const res = await fetch(`${FATSOMA}/events?${params}`, {
      headers: { Accept: 'application/vnd.api+json' },
      cache: 'no-store',
    });
    if (!res.ok) break;

    const json = (await res.json()) as {
      data?: FatsomaEvent[];
      included?: { type: string; id: string; attributes: FatsomaLocation }[];
      meta?: { 'total-count'?: number };
    };

    for (const inc of json.included || []) {
      if (inc.type === 'locations') locById.set(inc.id, inc.attributes);
    }

    for (const event of json.data || []) {
      const attrs = event.attributes;
      if (!attrs?.name || attrs.expired) continue;

      const startsAt = attrs['starts-at'];
      if (!startsAt) continue;
      const startMs = new Date(startsAt).getTime();
      if (Number.isNaN(startMs) || startMs < now - 6 * 60 * 60 * 1000) continue;

      const locId = event.relationships?.location?.data?.id;
      const loc = locId ? locById.get(locId) : undefined;
      if (!isExeterUk(loc)) continue;
      if (/, NH\b/i.test(attrs.name) || /exeter, nh/i.test(attrs.name)) continue;

      const pricePence = attrs['price-max-with-fees'] ?? attrs['price-max'];
      const suggestedPrice =
        typeof pricePence === 'number' && pricePence > 0
          ? Math.round((pricePence / 100) * 100) / 100
          : undefined;

      out.push({
        id: `fatsoma:${event.id}`,
        fatsomaEventId: event.id,
        title: attrs.name.trim(),
        venue: (loc?.name || loc?.city || 'Exeter').trim(),
        eventDate: new Date(startsAt).toISOString(),
        suggestedPrice,
        source: 'fatsoma',
        sourceUrl: fatsomaEventUrl(attrs['vanity-name']),
      });
    }

    const batchSize = json.data?.length ?? 0;
    remoteCount += batchSize;
    if (batchSize === 0) break;

    const total = json.meta?.['total-count'];
    if (typeof total === 'number' && remoteCount >= total) break;
    if (typeof total !== 'number' && batchSize < 50) break;
  }

  return out;
}

async function loadExeterSuggestions(): Promise<EventSuggestion[]> {
  const queries = [
    'Exeter',
    'Arena Exeter',
    'Timepiece',
    'Move Exeter',
    'Exeter Freshers',
    'Exeter Phoenix',
    'Fever Exeter',
    'Walkabout Exeter',
  ];

  const batches = await Promise.all(
    queries.map((name) => fetchFatsomaNameSearch(name, name === 'Exeter' ? 3 : 1)),
  );
  const byId = new Map<string, EventSuggestion>();
  for (const item of batches.flat()) {
    byId.set(item.id, item);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );
}

export async function getExeterEventSuggestions(): Promise<EventSuggestion[]> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.items;

  try {
    const items = await loadExeterSuggestions();
    cached = { expiresAt: now + CACHE_MS, items };
    return items;
  } catch {
    return cached?.items ?? [];
  }
}

export function filterEventSuggestions(items: EventSuggestion[], query: string): EventSuggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 24);

  const tokens = q.split(/\s+/).filter(Boolean);
  const matched = items.filter((item) => {
    const hay = `${item.title} ${item.venue}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  return matched.slice(0, 24);
}

function buildLiveFatsomaQueries(query: string): string[] {
  const q = query.trim();
  if (!q) return [];

  const set = new Set<string>([q, `${q} Exeter`]);
  const lower = q.toLowerCase();

  for (const venue of matchingVenuesForSearch(q)) {
    set.add(venue.displayVenue);
    set.add(`${venue.name} Exeter`);
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']) {
      set.add(`${venue.name} ${day}`);
    }
  }

  if (lower.includes('tp') && lower.length <= 3) {
    set.add('Timepiece');
  }

  return [...set];
}

export async function searchExeterEventSuggestions(query: string): Promise<EventSuggestion[]> {
  const q = query.trim();
  const base = await getExeterEventSuggestions();

  if (!q) {
    return base.slice(0, 24);
  }

  const liveQueries = buildLiveFatsomaQueries(q);
  const liveBatches = await Promise.all(
    liveQueries.map((name) => fetchFatsomaNameSearch(name, name.toLowerCase().includes('exeter') ? 2 : 1)),
  );

  const byId = new Map<string, EventSuggestion>();
  for (const item of [...base, ...liveBatches.flat()]) {
    byId.set(item.id, item);
  }

  const merged = [...byId.values()].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
  );

  return filterEventSuggestions(merged, q);
}

export const FIXR_EXETER_URL = 'https://fixr.co/search?q=exeter';

const FATSOMA_EVENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseFatsomaEventId(raw: string): string | null {
  const trimmed = raw.trim();
  if (FATSOMA_EVENT_ID.test(trimmed)) return trimmed;
  if (trimmed.startsWith('fatsoma:')) {
    const id = trimmed.slice('fatsoma:'.length);
    return FATSOMA_EVENT_ID.test(id) ? id : null;
  }
  return null;
}

export async function getFatsomaEventListingOptions(eventId: string): Promise<EventListingOptions | null> {
  const id = parseFatsomaEventId(eventId);
  if (!id) return null;

  const [eventRes, optionsRes] = await Promise.all([
    fetch(`${FATSOMA}/events/${id}?include=location`, {
      headers: { Accept: 'application/vnd.api+json' },
      cache: 'no-store',
    }),
    fetch(`${FATSOMA}/events/${id}/ticket-options?per_page=50`, {
      headers: { Accept: 'application/vnd.api+json' },
      cache: 'no-store',
    }),
  ]);

  if (!eventRes.ok) return null;

  const eventJson = (await eventRes.json()) as {
    data?: FatsomaEvent & { attributes: FatsomaEvent['attributes'] };
    included?: { type: string; id: string; attributes: FatsomaLocation }[];
  };
  const event = eventJson.data;
  if (!event?.attributes?.name) return null;

  const loc = (eventJson.included || []).find((x) => x.type === 'locations')?.attributes;
  if (!isExeterUk(loc)) return null;

  const optionsJson = optionsRes.ok
    ? ((await optionsRes.json()) as {
        data?: {
          id: string;
          attributes: {
            name?: string;
            visible?: boolean;
            addon?: boolean;
            upsell?: boolean;
            position?: number;
            'on-sale-status'?: string;
            'price-sub-unit'?: number;
            'transaction-fee-sub-unit'?: number;
          };
        }[];
      })
    : { data: [] };

  const ticketTypes: EventTicketType[] = (optionsJson.data || [])
    .filter((row) => {
      const a = row.attributes;
      if (a.visible === false) return false;
      if (a.addon || a.upsell) return false;
      return Boolean(a.name?.trim());
    })
    .sort((a, b) => (a.attributes.position ?? 0) - (b.attributes.position ?? 0))
    .map((row) => {
      const a = row.attributes;
      const sub = a['price-sub-unit'] ?? 0;
      const fee = a['transaction-fee-sub-unit'] ?? 0;
      const price = Math.round(((sub + fee) / 100) * 100) / 100;
      return {
        id: row.id,
        name: a.name!.trim(),
        price: price > 0 ? price : 0,
        saleStatus: a['on-sale-status'] || 'unknown',
      };
    });

  const startsAt = event.attributes['starts-at'];
  const attrs = event.attributes;

  return {
    eventId: id,
    title: attrs.name!.trim(),
    venue: (loc?.name || loc?.city || 'Exeter').trim(),
    eventDate: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
    sourceUrl: fatsomaEventUrl(attrs['vanity-name']),
    source: 'fatsoma',
    ticketTypes,
  };
}
