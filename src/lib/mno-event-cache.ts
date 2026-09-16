import type { MnoEventDetail, MnoEventSummary } from '@/lib/mynightout';

const TTL_MS = 10 * 60 * 1000;

type Entry<T> = { at: number; data: T };

const allEvents = { entry: null as Entry<MnoEventSummary[]> | null };
const byVenue = new Map<string, Entry<MnoEventSummary[]>>();
const byEventId = new Map<string, Entry<MnoEventDetail>>();

function fresh<T>(entry: Entry<T> | null | undefined): T | null {
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) return null;
  return entry.data;
}

export function getCachedMnoEvents(): MnoEventSummary[] | null {
  return fresh(allEvents.entry);
}

export function setCachedMnoEvents(data: MnoEventSummary[]) {
  allEvents.entry = { at: Date.now(), data };
}

export function getCachedMnoVenueEvents(venue: string): MnoEventSummary[] | null {
  return fresh(byVenue.get(venue.trim().toLowerCase()));
}

export function setCachedMnoVenueEvents(venue: string, data: MnoEventSummary[]) {
  byVenue.set(venue.trim().toLowerCase(), { at: Date.now(), data });
}

export function getCachedMnoEventDetail(eventId: string): MnoEventDetail | null {
  return fresh(byEventId.get(eventId));
}

export function setCachedMnoEventDetail(eventId: string, data: MnoEventDetail) {
  byEventId.set(eventId, { at: Date.now(), data });
}
