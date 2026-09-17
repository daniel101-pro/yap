import type { NightlifeTicket } from '@/types';
import type { MnoEventDetail } from '@/lib/mynightout';
import { normalizeSlotName } from '@/lib/mynightout';

export function isBuyableResaleTicket(t: NightlifeTicket): boolean {
  return !t.isSold && t.status !== 'sold' && t.status !== 'reserved';
}

export function isPurchasableByBuyer(t: NightlifeTicket): boolean {
  return isBuyableResaleTicket(t) && t.purchaseReady !== false && !t.isOwn;
}

function pickPoolIndex(pool: NightlifeTicket[], predicate: (t: NightlifeTicket) => boolean): number {
  let idx = pool.findIndex((t) => predicate(t) && t.purchaseReady !== false);
  if (idx < 0) idx = pool.findIndex(predicate);
  return idx;
}

function venueLooselyMatches(ticketVenue: string, eventVenue: string): boolean {
  const v = ticketVenue.toLowerCase().trim();
  const e = eventVenue.toLowerCase().trim();
  if (!v || !e) return true;
  const vHead = v.split(/\s+/)[0] ?? v;
  const eHead = e.split(/\s+/)[0] ?? e;
  return v.includes(eHead) || e.includes(vHead) || vHead === eHead;
}

/** Map MyNightOut entry slots to YAP resale listings for this event. */
export function buildYapResaleBySlot(
  event: MnoEventDetail,
  tickets: NightlifeTicket[],
): Map<string, NightlifeTicket> {
  const map = new Map<string, NightlifeTicket>();
  const eventId = String(event.id);
  const eventVenue = event.venue?.name ?? '';

  const buyable = tickets.filter(isBuyableResaleTicket);

  const forEvent = buyable.filter((t) => {
    if (t.mnoEventId != null && String(t.mnoEventId) === eventId) return true;
    if (!t.mnoEventId && eventVenue && venueLooselyMatches(t.venue, eventVenue)) return true;
    return false;
  });

  const pool = [...forEvent];

  for (const slot of event.tickets) {
    const slotId = String(slot.id);
    const slotNorm = normalizeSlotName(slot.name);

    let idx = pickPoolIndex(
      pool,
      (t) => t.mnoTicketId != null && String(t.mnoTicketId) === slotId,
    );

    if (idx < 0) {
      idx = pickPoolIndex(pool, (t) => {
        const titleNorm = normalizeSlotName(t.title);
        if (titleNorm.includes(slotNorm) || slotNorm.includes(titleNorm)) return true;
        const tail = t.title.split(' · ').pop()?.trim() ?? '';
        return normalizeSlotName(tail) === slotNorm;
      });
    }

    if (idx >= 0) {
      map.set(slot.id, pool[idx]!);
      pool.splice(idx, 1);
    }
  }

  return map;
}
