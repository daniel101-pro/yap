'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronRight, Loader2 } from 'lucide-react';
import type { MnoEventSummary } from '@/lib/mynightout';
import { formatMnoInstant, mnoEventMatchesSearch } from '@/lib/mynightout';
import { compareExeterVenueSections } from '@/lib/exeter-venues';
import { getCachedMnoEvents, setCachedMnoEvents } from '@/lib/mno-event-cache';

type Props = {
  searchQuery: string;
  onSelectEvent: (eventId: string) => void;
};

function EventRow({ ev, onSelect }: { ev: MnoEventSummary; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full overflow-hidden rounded-2xl bg-surface text-left ring-1 ring-divider transition hover:ring-exeter/35"
    >
      {ev.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ev.image} alt="" className="h-[88px] w-[88px] shrink-0 object-cover sm:h-24 sm:w-24" />
      ) : (
        <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center bg-exeter/10 text-exeter sm:h-24 sm:w-24">
          <Calendar className="h-8 w-8" strokeWidth={1.5} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-snug text-foreground line-clamp-2">{ev.name.trim()}</p>
          <p className="mt-1 text-[12px] text-muted">
            {ev.venue?.name?.trim() || 'Exeter'}
            {ev.openTime ? ` · ${formatMnoInstant(ev.openTime)}` : ''}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </div>
    </button>
  );
}

export default function NightlifeMnoEventsBrowse({ searchQuery, onSelectEvent }: Props) {
  const [events, setEvents] = useState<MnoEventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cached = getCachedMnoEvents();
    if (cached?.length) {
      setEvents(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/nightlife/mynightout/events', { signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.events) ? d.events : [];
        setCachedMnoEvents(list);
        setEvents(list);
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        setError('Could not load events');
        setEvents([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = events.filter((ev) => !ev.closeTime || ev.closeTime > now - 60 * 60 * 1000);
    list.sort((a, b) => (a.openTime ?? 0) - (b.openTime ?? 0));
    if (searchQuery.trim()) {
      list = list.filter((ev) => mnoEventMatchesSearch(ev, searchQuery));
    }
    return list;
  }, [events, searchQuery]);

  const byVenue = useMemo(() => {
    const map = new Map<string, MnoEventSummary[]>();
    for (const ev of filtered) {
      const venue = ev.venue?.name?.replace(/\s+/g, ' ').trim() || 'Exeter';
      const bucket = map.get(venue) ?? [];
      bucket.push(ev);
      map.set(venue, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => compareExeterVenueSections(a, b));
  }, [filtered]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-exeter" />
      </div>
    );
  }

  if (error) {
    return <p className="py-8 text-center text-[13px] text-amber-600 dark:text-amber-400">{error}</p>;
  }

  if (filtered.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-muted">
        {searchQuery.trim() ? 'No events match that search.' : 'No upcoming events rn.'}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {byVenue.map(([venue, venueEvents]) => (
        <section key={venue}>
          <h3 className="mb-2.5 text-[13px] font-bold text-foreground">{venue}</h3>
          <ul className="space-y-2.5">
            {venueEvents.map((ev) => (
              <li key={ev.id}>
                <EventRow ev={ev} onSelect={() => onSelectEvent(ev.id)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
