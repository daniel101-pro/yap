'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Calendar, ChevronRight, Flame, Loader2, MapPin, X } from 'lucide-react';
import type { NightlifePin, NightlifeTicket } from '@/types';
import type { MnoEventDetail, MnoEventSummary } from '@/lib/mynightout';
import { formatMnoInstant, normalizeSlotName } from '@/lib/mynightout';
import {
  getCachedMnoEventDetail,
  getCachedMnoVenueEvents,
  setCachedMnoEventDetail,
  setCachedMnoVenueEvents,
} from '@/lib/mno-event-cache';

type VenueSheetProps = {
  pin: NightlifePin | null;
  open: boolean;
  onClose: () => void;
  onSelectEvent: (eventId: string) => void;
};

export function NightlifeVenueEventsSheet({ pin, open, onClose, onSelectEvent }: VenueSheetProps) {
  const [events, setEvents] = useState<MnoEventSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !pin) return;
    const cached = getCachedMnoVenueEvents(pin.name);
    if (cached) {
      setEvents(cached);
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/nightlife/mynightout/events?venue=${encodeURIComponent(pin.name)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.events) ? d.events : [];
        setCachedMnoVenueEvents(pin.name, list);
        setEvents(list);
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setError('Could not load events');
        setEvents([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, pin?.id, pin?.name]);

  if (!open || !pin) return null;

  return (
    <SheetShell onClose={onClose} title={pin.name}>
      <p className="mb-4 text-[13px] text-muted">What&apos;s on. Tap an event for entry times.</p>
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-exeter" />
        </div>
      )}
      {error && <p className="text-[13px] text-amber-600 dark:text-amber-400">{error}</p>}
      {!loading && !error && events.length === 0 && (
        <p className="py-8 text-center text-[13px] text-muted">Nothing listed for this spot rn.</p>
      )}
      <ul className="space-y-2.5">
        {events.map((ev) => (
          <li key={ev.id}>
            <button
              type="button"
              onClick={() => onSelectEvent(ev.id)}
              className="flex w-full overflow-hidden rounded-2xl bg-surface text-left ring-1 ring-divider transition hover:ring-exeter/35"
            >
              {ev.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ev.image} alt="" className="h-24 w-24 shrink-0 object-cover" />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center bg-exeter/10 text-exeter">
                  <Calendar className="h-8 w-8" strokeWidth={1.5} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 items-center gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold leading-snug text-foreground line-clamp-2">
                    {ev.name.trim()}
                  </p>
                  <p className="mt-1 text-[12px] text-muted">
                    {ev.openTime ? formatMnoInstant(ev.openTime) : ''}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </SheetShell>
  );
}

type EventSheetProps = {
  eventId: string | null;
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  yapTickets: NightlifeTicket[];
  onBuyYap: (ticketId: string) => void;
  checkoutLoadingId: string | null;
  onSellForEvent: (event: MnoEventDetail, slotId?: string) => void;
  repCode?: string;
  onRepCodeChange?: (value: string) => void;
};

export function NightlifeMnoEventSheet({
  eventId,
  open,
  onClose,
  onBack,
  yapTickets,
  onBuyYap,
  checkoutLoadingId,
  onSellForEvent,
  repCode = '',
  onRepCodeChange,
}: EventSheetProps) {
  const [event, setEvent] = useState<MnoEventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trendingSlotId, setTrendingSlotId] = useState<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || !eventId) {
      if (!open) loadedIdRef.current = null;
      return;
    }

    if (loadedIdRef.current === eventId) return;

    const cached = getCachedMnoEventDetail(eventId);
    if (cached) {
      loadedIdRef.current = eventId;
      setEvent(cached);
      setLoading(false);
      setError('');
      return;
    }

    loadedIdRef.current = eventId;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/nightlife/mynightout/events/${encodeURIComponent(eventId)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.event) throw new Error('missing');
        const detail = d.event as MnoEventDetail;
        setCachedMnoEventDetail(eventId, detail);
        setEvent(detail);
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        if (loadedIdRef.current === eventId) loadedIdRef.current = null;
        setError('Could not load event');
        setEvent(null);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [open, eventId]);

  useEffect(() => {
    if (!open || !eventId) {
      setTrendingSlotId(null);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/nightlife/mynightout/events/${encodeURIComponent(eventId)}/slot-demand`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((d) => {
        setTrendingSlotId(typeof d.trendingSlotId === 'string' ? d.trendingSlotId : null);
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setTrendingSlotId(null);
      });
    return () => controller.abort();
  }, [open, eventId, yapTickets]);

  const yapBySlot = useMemo(() => {
    const map = new Map<string, NightlifeTicket>();
    if (!event) return map;
    const venueKey = event.venue?.name?.toLowerCase() ?? '';
    for (const slot of event.tickets) {
      const slotNorm = normalizeSlotName(slot.name);
      const exact = yapTickets.find(
        (t) =>
          !t.isSold &&
          t.status !== 'sold' &&
          t.mnoEventId === event.id &&
          t.mnoTicketId === slot.id,
      );
      if (exact) {
        map.set(slot.id, exact);
        continue;
      }
      const fuzzy = yapTickets.find((t) => {
        if (t.isSold || t.status === 'sold') return false;
        const v = t.venue.toLowerCase();
        if (venueKey && !v.includes(venueKey.split(' ')[0]!) && !venueKey.includes(v.split(' ')[0]!)) {
          return false;
        }
        const titleNorm = normalizeSlotName(t.title);
        return titleNorm.includes(slotNorm) || slotNorm.includes(titleNorm.slice(-40));
      });
      if (fuzzy) map.set(slot.id, fuzzy);
    }
    return map;
  }, [event, yapTickets]);

  if (!open || !eventId) return null;

  return (
    <SheetShell
      onClose={onClose}
      onBack={onBack}
      title={event?.name?.trim() ?? 'Event'}
      wide
    >
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-exeter" />
        </div>
      )}
      {error && <p className="text-[13px] text-amber-600 dark:text-amber-400">{error}</p>}
      {event && !loading && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[20px] font-black leading-tight text-foreground">{event.name.trim()}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
              <MapPin className="h-4 w-4 shrink-0" strokeWidth={2} />
              {event.venue?.name ?? 'Exeter'}
            </p>
            {event.openTime != null && (
              <p className="mt-2 text-[13px] text-muted">
                Opens {formatMnoInstant(event.openTime)}
              </p>
            )}
            {event.closeTime != null && (
              <p className="text-[13px] text-muted">Closes {formatMnoInstant(event.closeTime)}</p>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[15px] font-bold text-foreground">Entry times</h3>
              <button
                type="button"
                onClick={() => onSellForEvent(event)}
                className="text-[12px] font-bold text-exeter"
              >
                Sell yours
              </button>
            </div>
            <p className="mb-3 text-[12px] text-muted-light">
              Student resale on YAP. No listing = sold out.
            </p>
            {onRepCodeChange && (
              <label className="mb-3 block">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                  Rep code (optional)
                </span>
                <input
                  type="text"
                  value={repCode}
                  onChange={(e) => onRepCodeChange(e.target.value)}
                  placeholder="Friend’s code"
                  autoComplete="off"
                  spellCheck={false}
                  className="mt-1.5 w-full rounded-xl bg-surface px-3 py-2.5 text-[14px] font-mono uppercase tracking-wide text-foreground ring-1 ring-white/10 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-light"
                />
              </label>
            )}
            <ul className="space-y-2">
              {event.tickets.map((slot) => {
                const yap = yapBySlot.get(slot.id);
                const soldOut = !yap;
                const isTrending = trendingSlotId === slot.id;
                return (
                  <li
                    key={slot.id}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ${
                      isTrending
                        ? 'bg-orange-500/10 ring-orange-500/45'
                        : 'bg-surface ring-white/10'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-start gap-2">
                      {isTrending && (
                        <motion.span
                          className="mt-0.5 shrink-0 text-orange-500"
                          animate={{ scale: [1, 1.2, 1], opacity: [0.85, 1, 0.85] }}
                          transition={{ duration: 0.85, repeat: Infinity, ease: 'easeInOut' }}
                          aria-hidden
                        >
                          <Flame className="h-4 w-4 fill-orange-500" strokeWidth={2} />
                        </motion.span>
                      )}
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold leading-snug text-foreground">
                          {slot.name}
                        </p>
                      </div>
                    </div>
                    {soldOut ? (
                      <span className="shrink-0 text-[12px] font-bold uppercase tracking-wide text-red-500">
                        Sold out
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={checkoutLoadingId === yap!.id}
                        onClick={() => onBuyYap(yap!.id)}
                        className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-bold text-white disabled:opacity-60 ${
                          isTrending ? 'bg-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.45)]' : 'bg-exeter'
                        }`}
                      >
                        {checkoutLoadingId === yap!.id ? (
                          '…'
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {isTrending && (
                              <Flame className="h-3.5 w-3.5 fill-white" strokeWidth={2} />
                            )}
                            £{yap!.price}
                          </span>
                        )}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {event.description?.trim() && (
            <p className="whitespace-pre-line text-[13px] leading-relaxed text-muted border-t border-white/10 pt-4">
              {event.description.trim()}
            </p>
          )}

          {event.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.image}
              alt=""
              className="w-full rounded-2xl object-cover max-h-52 ring-1 ring-white/10"
            />
          )}
        </div>
      )}
    </SheetShell>
  );
}

function SheetShell({
  children,
  onClose,
  onBack,
  title,
  wide,
}: {
  children: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  title: string;
  wide?: boolean;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <AnimatePresence>
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black"
          onClick={onClose}
          aria-hidden
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          className={`fixed inset-x-0 bottom-0 z-[201] mx-auto max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-[#0a0a0a] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 text-foreground shadow-2xl ring-1 ring-white/10 ${
            wide ? 'max-w-2xl' : 'max-w-2xl'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center gap-2">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface ring-1 ring-divider"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={2} />
              </button>
            ) : null}
            <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-foreground">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface ring-1 ring-divider"
              aria-label="Close"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
          {children}
        </motion.div>
      </>
    </AnimatePresence>
  );
}
