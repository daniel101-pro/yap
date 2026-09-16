'use client';

import type { EventListingOptions, EventSuggestion, EventTicketType } from '@/types';

const FIXR_API = 'https://api.fixr.co';

type JsonRecord = Record<string, unknown>;

export type FixrListingBundle = {
  suggestion: EventSuggestion;
  listing: EventListingOptions;
};

function fixrHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'FIXR-Platform': 'widget',
  };
}

function parseTimestamp(raw: unknown): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (typeof raw === 'string') {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function priceFromPenceOrPounds(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return undefined;
  if (raw === 0) return 0;
  const pounds = raw >= 100 ? raw / 100 : raw;
  return Math.round(pounds * 100) / 100;
}

function parseMoneyValue(raw: unknown): number | undefined {
  if (typeof raw === 'string') {
    const lower = raw.toLowerCase();
    if (lower.includes('free')) return 0;
    const match = raw.match(/(\d+(?:\.\d{1,2})?)/);
    if (match) {
      const n = Number(match[1]);
      if (Number.isFinite(n)) return Math.round(n * 100) / 100;
    }
    return undefined;
  }
  return priceFromPenceOrPounds(raw);
}

function eventLevelPrice(event: JsonRecord): number | undefined {
  const keys = [
    'min_ticket_price',
    'minimum_ticket_price',
    'min_price',
    'from_price',
    'cheapest_ticket_price',
    'lowest_price',
    'ticket_price',
    'price',
    'display_price',
    'formatted_min_price',
  ];

  for (const k of keys) {
    const p = parseMoneyValue(event[k]);
    if (p != null && p > 0) return p;
  }

  const pricing = event.pricing;
  if (pricing && typeof pricing === 'object') {
    for (const k of keys) {
      const p = parseMoneyValue((pricing as JsonRecord)[k]);
      if (p != null && p > 0) return p;
    }
  }

  return undefined;
}

function ticketTypesFromOptions(options: unknown): EventTicketType[] {
  if (!Array.isArray(options)) return [];

  return options
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null;
      const o = row as JsonRecord;
      const name = String(o.name ?? o.title ?? o.label ?? '').trim();
      if (!name) return null;
      const id = String(o.id ?? o.uuid ?? `${name}-${index}`);
      const price =
        parseMoneyValue(o.price) ??
        parseMoneyValue(o.price_pence) ??
        parseMoneyValue(o.face_value) ??
        parseMoneyValue(o.amount) ??
        parseMoneyValue(o.cost) ??
        parseMoneyValue(o.retail_price) ??
        parseMoneyValue(o.display_price) ??
        parseMoneyValue(o.formatted_price) ??
        0;
      const soldOut = Boolean(o.sold_out ?? o.is_sold_out);
      return {
        id,
        name,
        price,
        saleStatus: soldOut ? 'sold_out' : 'available',
      };
    })
    .filter((x): x is EventTicketType => x !== null);
}

function extractTicketTypes(event: JsonRecord): EventTicketType[] {
  for (const key of [
    'ticket_options',
    'ticket_options_list',
    'tickets',
    'ticket_types',
    'products',
    'skus',
  ] as const) {
    const types = ticketTypesFromOptions(event[key]);
    if (types.length > 0) return types;
  }

  const timed = event.timed_entries ?? event.timed_entry_groups ?? event.time_slots;
  if (!Array.isArray(timed)) {
    const minPrice = eventLevelPrice(event);
    if (minPrice != null) {
      return [{ id: 'general', name: 'General admission', price: minPrice, saleStatus: 'available' }];
    }
    return [{ id: 'standard', name: 'Standard ticket', price: 0, saleStatus: 'available' }];
  }

  const out: EventTicketType[] = [];
  for (const entry of timed) {
    if (!entry || typeof entry !== 'object') continue;
    const slot = entry as JsonRecord;
    const slotLabel = String(slot.name ?? slot.label ?? slot.starts_at ?? '').trim();
    const slotTypes = ticketTypesFromOptions(slot.ticket_options ?? slot.tickets);
    for (const t of slotTypes) {
      out.push({
        ...t,
        id: `${slotLabel || 'slot'}-${t.id}`,
        name: slotLabel ? `${slotLabel} · ${t.name}` : t.name,
      });
    }
  }
  return out;
}

function eventRecordToBundle(
  event: JsonRecord,
  venueLabel: string,
  shopId: string,
): FixrListingBundle | null {
  const id = event.id ?? event.event_id;
  const title = String(event.name ?? event.title ?? '').trim();
  if (id == null || !title) return null;

  const eventId = String(id);
  const slug = event.slug ?? event.url_slug;
  const sourceUrl =
    typeof slug === 'string' && slug.length > 0
      ? `https://fixr.co/event/${slug}`
      : `https://fixr.co/ticketshop/${shopId}`;

  const venue =
    String(
      (event.venue as JsonRecord | undefined)?.name ??
        event.venue_name ??
        event.location ??
        venueLabel,
    ).trim() || venueLabel;

  const eventDate = parseTimestamp(
    event.start_at ?? event.starts_at ?? event.start_time ?? event.date ?? event.starts,
  );

  const ticketTypes = extractTicketTypes(event);
  const suggestedPrice = ticketTypes.find((t) => t.price > 0)?.price;

  const suggestion: EventSuggestion = {
    id: `fixr:${eventId}`,
    fixrEventId: eventId,
    fixrShopId: shopId,
    title,
    venue,
    eventDate,
    suggestedPrice,
    source: 'fixr',
    sourceUrl,
  };

  const listing: EventListingOptions = {
    eventId,
    title,
    venue,
    eventDate,
    sourceUrl,
    ticketTypes,
    source: 'fixr',
  };

  return { suggestion, listing };
}

function matchesQuery(bundle: FixrListingBundle, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = `${bundle.suggestion.title} ${bundle.suggestion.venue}`.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((t) => hay.includes(t));
}

export async function fetchFixrShopListings(
  shopId: string,
  venueLabel: string,
  query: string,
): Promise<FixrListingBundle[]> {
  const url = new URL(`${FIXR_API}/api/v2/ticket-shop/${shopId}/events`);
  url.searchParams.set('limit', '1000');
  url.searchParams.set('group_timed_entry', 'true');

  const res = await fetch(url.toString(), { headers: fixrHeaders(), cache: 'no-store' });
  if (!res.ok) return [];

  const json = (await res.json()) as { data?: unknown[] };
  const rows = Array.isArray(json.data) ? json.data : [];

  return rows
    .map((row) => (row && typeof row === 'object' ? eventRecordToBundle(row as JsonRecord, venueLabel, shopId) : null))
    .filter((x): x is FixrListingBundle => x !== null)
    .filter((b) => matchesQuery(b, query));
}

export function listingFromFixrSuggestion(
  suggestion: EventSuggestion,
  listing: EventListingOptions,
): EventListingOptions {
  return {
    ...listing,
    eventId: suggestion.fixrEventId ?? listing.eventId,
    title: suggestion.title,
    venue: suggestion.venue,
    eventDate: suggestion.eventDate,
    sourceUrl: suggestion.sourceUrl,
    source: 'fixr',
  };
}
