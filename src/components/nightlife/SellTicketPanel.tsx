'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Banknote,
  Ticket,
  Loader2,
  ChevronLeft,
  Search,
  Check,
  Upload,
  ImageIcon,
} from 'lucide-react';
import type { EventListingOptions, EventSuggestion, EventTicketType } from '@/types';
import { fetchFixrShopListings, listingFromFixrSuggestion, type FixrListingBundle } from '@/lib/fixr-client';

export type SellTicketPayload = {
  title: string;
  venue: string;
  price: number;
  eventDate: Date;
  eventEndDate?: Date;
  quantity: number;
  mnoEventId?: string;
  mnoTicketId?: string;
  ticketProofUrl?: string;
  ticketProofMime: string;
  ticketProofBase64?: string;
};

export type MnoSellSeed = { eventId: string; slotId?: string };

interface SellTicketPanelProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: SellTicketPayload) => void | Promise<void>;
  mnoSellSeed?: MnoSellSeed | null;
  onMnoSellSeedConsumed?: () => void;
}

type Step = 'find' | 'ticket-type' | 'price';

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function clampListingTitle(eventTitle: string, ticketName: string): string {
  const shortTicket = ticketName.replace(/\s+/g, ' ').trim();
  const combined = `${eventTitle.replace(/\s+/g, ' ').trim()} · ${shortTicket}`;
  return combined.length <= 80 ? combined : `${combined.slice(0, 77)}…`;
}

function resolveListingPrice(
  type: EventTicketType,
  event: EventSuggestion | null,
  listing: EventListingOptions | null,
): number | undefined {
  if (type.price > 0) return type.price;
  if (event?.suggestedPrice != null && event.suggestedPrice > 0) return event.suggestedPrice;
  const fromListing = listing?.ticketTypes.find((t) => t.price > 0)?.price;
  if (fromListing != null && fromListing > 0) return fromListing;
  return undefined;
}

function priceStepHint(
  type: EventTicketType,
  event: EventSuggestion | null,
  listing: EventListingOptions | null,
): string {
  const face = resolveListingPrice(type, event, listing);
  if (face != null && face > 0) {
    return `What are you asking? Face value was about £${face}.`;
  }
  if (face === 0) {
    return 'Free on Fixr. Set a price if you’re charging.';
  }
  return 'Enter your asking price (what the buyer pays you).';
}

function saleStatusLabel(status: string, source?: string): string | null {
  if (status === 'available') return null;
  const platform = source === 'fixr' ? 'Fixr' : 'Fatsoma';
  if (status === 'sold_out' || status === 'completed') return `Sold out on ${platform}`;
  if (status === 'not_on_sale') return 'Not on sale yet';
  return null;
}

export default function SellTicketPanel({
  open,
  onClose,
  onSubmit,
  mnoSellSeed,
  onMnoSellSeedConsumed,
}: SellTicketPanelProps) {
  const [step, setStep] = useState<Step>('find');
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<EventSuggestion[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchError, setSearchError] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<EventSuggestion | null>(null);
  const [listing, setListing] = useState<EventListingOptions | null>(null);
  const [loadingListing, setLoadingListing] = useState(false);
  const [listingError, setListingError] = useState('');

  const [selectedType, setSelectedType] = useState<EventTicketType | null>(null);
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofError, setProofError] = useState('');
  const fixrListingsRef = useRef<Map<string, EventListingOptions>>(new Map());
  const [mnoMeta, setMnoMeta] = useState<{ eventId: string; openTime?: number; closeTime?: number } | null>(
    null,
  );

  const resetFlow = () => {
    setStep('find');
    setSearch('');
    setSuggestions([]);
    setSearchError('');
    setSelectedEvent(null);
    setListing(null);
    setListingError('');
    setSelectedType(null);
    setPrice('');
    setQty('1');
    setProofFile(null);
    setProofPreview(null);
    setProofError('');
    fixrListingsRef.current.clear();
    setMnoMeta(null);
  };

  useEffect(() => {
    if (!open || !mnoSellSeed?.eventId) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/nightlife/mynightout/events/${encodeURIComponent(mnoSellSeed.eventId)}`,
          { cache: 'no-store' },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.event || cancelled) return;

        const ev = data.event as {
          id: string;
          name: string;
          venue?: { name?: string };
          openTime?: number;
          closeTime?: number;
          tickets?: { id: string; name: string }[];
        };

        const ticketTypes: EventTicketType[] = (Array.isArray(ev.tickets) ? ev.tickets : []).map(
          (t) => ({
            id: String(t.id),
            name: String(t.name),
            price: 0,
            saleStatus: 'available' as const,
          }),
        );

        const listingOptions: EventListingOptions = {
          eventId: ev.id,
          title: ev.name.trim(),
          venue: ev.venue?.name?.trim() || 'Exeter',
          eventDate: ev.openTime ? new Date(ev.openTime).toISOString() : new Date().toISOString(),
          sourceUrl: `https://mynightout.app/events/${ev.id}`,
          ticketTypes,
          source: 'fixr',
        };

        setMnoMeta({ eventId: ev.id, openTime: ev.openTime, closeTime: ev.closeTime });
        setSelectedEvent({
          id: `mno:${ev.id}`,
          title: listingOptions.title,
          venue: listingOptions.venue,
          eventDate: listingOptions.eventDate,
          source: 'fixr',
          sourceUrl: listingOptions.sourceUrl,
        });
        setListing(listingOptions);
        setStep('ticket-type');

        const pick =
          mnoSellSeed.slotId && ticketTypes.find((t) => t.id === mnoSellSeed.slotId)
            ? ticketTypes.find((t) => t.id === mnoSellSeed.slotId)!
            : ticketTypes.length === 1
              ? ticketTypes[0]!
              : null;

        if (pick) {
          setSelectedType(pick);
          setPrice('');
          setStep('price');
        }
      } finally {
        onMnoSellSeedConsumed?.();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, mnoSellSeed, onMnoSellSeedConsumed]);

  useEffect(() => {
    if (!proofFile) {
      setProofPreview(null);
      return;
    }
    const isImage =
      proofFile.type.startsWith('image/') ||
      /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(proofFile.name);
    if (!isImage) {
      setProofPreview(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const onProofSelected = (file: File) => {
    setProofError('');
    setProofFile(file);
  };

  const uploadProof = async (): Promise<{
    mime: string;
    url?: string;
    base64?: string;
  }> => {
    if (!proofFile) {
      throw new Error('Add your ticket screenshot or PDF first');
    }
    const form = new FormData();
    form.append('file', proofFile);
    const res = await fetch('/api/nightlife/tickets/proof', { method: 'POST', body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed');
    }
    if (typeof data.mime !== 'string') {
      throw new Error('Upload failed');
    }
    if (data.storage === 'inline' && typeof data.data === 'string') {
      return { mime: data.mime, base64: data.data };
    }
    if (typeof data.url === 'string') {
      return { mime: data.mime, url: data.url };
    }
    throw new Error('Upload failed');
  };

  const mergeFixrBundles = (bundles: FixrListingBundle[], existing: EventSuggestion[]) => {
    const byId = new Map<string, EventSuggestion>();
    for (const item of existing) byId.set(item.id, item);
    for (const bundle of bundles) {
      byId.set(bundle.suggestion.id, bundle.suggestion);
      fixrListingsRef.current.set(bundle.suggestion.id, bundle.listing);
    }
    return [...byId.values()].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
    );
  };

  useEffect(() => {
    if (!open) {
      resetFlow();
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSearch(true);
      setSearchError('');
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        const res = await fetch(`/api/nightlife/event-suggestions?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSearchError(typeof data.error === 'string' ? data.error : 'Could not search events');
          setSuggestions([]);
          return;
        }
        let merged = Array.isArray(data.suggestions) ? data.suggestions : [];
        const fixrVenues = Array.isArray(data.fixrVenues)
          ? (data.fixrVenues as { name?: string; shopId?: string }[])
          : [];

        if (fixrVenues.length > 0 && search.trim()) {
          const fixrResults = await Promise.all(
            fixrVenues
              .filter((v) => v.shopId && v.name)
              .map((v) => fetchFixrShopListings(v.shopId!, v.name!, search.trim())),
          );
          merged = mergeFixrBundles(fixrResults.flat(), merged);
        }

        setSuggestions(merged);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setSearchError('Could not search events');
        setSuggestions([]);
      } finally {
        setLoadingSearch(false);
      }
    }, search.trim() ? 260 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, search]);

  const pickEvent = async (event: EventSuggestion) => {
    setSelectedEvent(event);
    setListing(null);
    setSelectedType(null);
    setListingError('');
    setLoadingListing(true);
    setStep('ticket-type');

    if (event.source === 'fixr') {
      try {
        const cached = fixrListingsRef.current.get(event.id);
        let nextListing = cached ? listingFromFixrSuggestion(event, cached) : null;

        if (!nextListing && event.fixrShopId) {
          const bundles = await fetchFixrShopListings(
            event.fixrShopId,
            event.venue,
            event.title,
          );
          const match = bundles.find((b) => b.suggestion.id === event.id);
          if (match) {
            fixrListingsRef.current.set(event.id, match.listing);
            nextListing = listingFromFixrSuggestion(event, match.listing);
          }
        }

        if (!nextListing) {
          setListingError('Could not load Fixr ticket types');
          return;
        }

        setListing(nextListing);
        if (nextListing.ticketTypes.length === 1) {
          const only = nextListing.ticketTypes[0];
          setSelectedType(only);
          const face = resolveListingPrice(only, event, nextListing);
          setPrice(face != null && face > 0 ? String(face) : '');
          setStep('price');
        }
      } catch {
        setListingError('Could not load Fixr ticket types');
      } finally {
        setLoadingListing(false);
      }
      return;
    }

    const fatsomaId = event.fatsomaEventId || event.id.replace(/^fatsoma:/, '');

    try {
      const res = await fetch(`/api/nightlife/events/${fatsomaId}/listing-options`, {
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setListingError(typeof data.error === 'string' ? data.error : 'Could not load ticket types');
        return;
      }
      const nextListing = data.listing ?? null;
      setListing(nextListing);
      if (nextListing?.ticketTypes?.length === 1) {
        const only = nextListing.ticketTypes[0];
        setSelectedType(only);
        const face = resolveListingPrice(only, event, nextListing);
        setPrice(face != null && face > 0 ? String(face) : '');
        setStep('price');
      }
    } catch {
      setListingError('Could not load ticket types');
    } finally {
      setLoadingListing(false);
    }
  };

  const pickTicketType = (type: EventTicketType) => {
    setSelectedType(type);
    const face = resolveListingPrice(type, selectedEvent, listing);
    setPrice(face != null && face > 0 ? String(face) : '');
    setStep('price');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!listing || !selectedType) return;
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!proofFile) {
      setProofError('Upload your ticket (Fixr screenshot or PDF) so the buyer gets it by email.');
      return;
    }

    setSubmitting(true);
    setProofError('');
    try {
      const proof = await uploadProof();
      await onSubmit({
        title: clampListingTitle(listing.title, selectedType.name),
        venue: listing.venue,
        price: amount,
        eventDate: new Date(listing.eventDate),
        ...(mnoMeta?.closeTime
          ? { eventEndDate: new Date(mnoMeta.closeTime) }
          : listing.eventDate
            ? { eventEndDate: new Date(new Date(listing.eventDate).getTime() + 6 * 60 * 60 * 1000) }
            : {}),
        quantity: Math.max(1, Number(qty) || 1),
        ...(mnoMeta?.eventId ? { mnoEventId: mnoMeta.eventId, mnoTicketId: selectedType.id } : {}),
        ticketProofMime: proof.mime,
        ...(proof.url ? { ticketProofUrl: proof.url } : { ticketProofBase64: proof.base64 }),
      });
      onClose();
    } catch (err) {
      setProofError(err instanceof Error ? err.message : 'Could not upload ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const headerTitle =
    step === 'find' ? 'Sell a ticket' : step === 'ticket-type' ? 'Your ticket type' : 'Your price';

  const goBack = () => {
    if (step === 'price') {
      setStep('ticket-type');
      setSelectedType(null);
      return;
    }
    if (step === 'ticket-type') {
      setStep('find');
      setSelectedEvent(null);
      setListing(null);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto flex max-h-[92dvh] max-w-2xl flex-col rounded-t-3xl bg-background shadow-2xl"
          >
            <div className="flex shrink-0 justify-center pt-2.5 pb-1">
              <div className="h-1 w-9 rounded-full bg-muted-light/50" />
            </div>
            <div className="flex shrink-0 items-center justify-between border-b border-divider px-5 py-3">
              <div className="flex items-center gap-2">
                {step !== 'find' && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-surface"
                    aria-label="Back"
                  >
                    <ChevronLeft className="h-4 w-4 text-foreground" strokeWidth={2} />
                  </button>
                )}
                <Ticket className="h-5 w-5 text-exeter" strokeWidth={2} />
                <h2 className="text-[16px] font-bold text-foreground">{headerTitle}</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface"
              >
                <X className="h-4 w-4 text-muted" strokeWidth={2} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 pb-8">
              {step === 'find' && (
                <div className="space-y-3">
                  <p className="text-[13px] text-muted">
                    Search the night or venue. We pull entry times from Fixr/Fatsoma.
                  </p>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search e.g. Timepiece, Freshers, ABBA…"
                      autoFocus
                      className="w-full rounded-xl bg-surface py-3 pl-10 pr-4 text-[14px] outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
                    />
                  </div>

                  {loadingSearch && (
                    <div className="flex items-center gap-2 py-4 text-[13px] text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching…
                    </div>
                  )}

                  {!loadingSearch && searchError && (
                    <p className="text-[13px] text-amber-600 dark:text-amber-400">{searchError}</p>
                  )}

                  {!loadingSearch && !searchError && suggestions.length === 0 && (
                    <p className="py-4 text-center text-[13px] text-muted">
                      Nothing matched. Try the date (e.g. Saturday 12.09) or venue. Timepiece
                      nights are on Fixr.
                    </p>
                  )}

                  {!loadingSearch && suggestions.length > 0 && (
                    <ul className="space-y-2">
                      {suggestions.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => pickEvent(item)}
                            className="w-full rounded-xl bg-surface px-4 py-3 text-left ring-1 ring-divider transition active:scale-[0.99] hover:ring-exeter/35"
                          >
                            <p className="line-clamp-2 text-[14px] font-semibold text-foreground">{item.title}</p>
                            <p className="mt-1 text-[12px] text-muted">
                              {item.venue} · {formatWhen(item.eventDate)}
                            </p>
                            <span className="mt-1.5 inline-block rounded-md bg-exeter/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-exeter">
                              {item.source}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {step === 'ticket-type' && (
                <div className="space-y-3">
                  {(selectedEvent || listing) && (
                    <div className="rounded-xl bg-exeter/8 px-4 py-3 ring-1 ring-exeter/15">
                      <p className="line-clamp-2 text-[14px] font-bold text-foreground">
                        {listing?.title ?? selectedEvent?.title}
                      </p>
                      <p className="mt-1 text-[12px] text-muted">
                        {listing?.venue ?? selectedEvent?.venue} ·{' '}
                        {formatWhen(listing?.eventDate ?? selectedEvent?.eventDate ?? '')}
                      </p>
                    </div>
                  )}

                  <p className="text-[13px] text-muted">Which ticket matches yours? (release, queue jump, day, etc.)</p>

                  {loadingListing && (
                    <div className="flex items-center gap-2 py-6 text-[13px] text-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading ticket types…
                    </div>
                  )}

                  {!loadingListing && listingError && (
                    <p className="text-[13px] text-amber-600 dark:text-amber-400">{listingError}</p>
                  )}

                  {!loadingListing && listing && listing.ticketTypes.length === 0 && (
                    <p className="text-[13px] text-muted">
                      No entry times on this one. Pick another event.
                    </p>
                  )}

                  {!loadingListing && listing && listing.ticketTypes.length > 0 && (
                    <ul className="space-y-2">
                      {listing.ticketTypes.map((type) => {
                        const badge = saleStatusLabel(type.saleStatus, listing?.source ?? selectedEvent?.source);
                        const face = resolveListingPrice(type, selectedEvent, listing);
                        return (
                          <li key={type.id}>
                            <button
                              type="button"
                              onClick={() => pickTicketType(type)}
                              className="flex w-full items-start gap-3 rounded-xl bg-surface px-4 py-3 text-left ring-1 ring-divider transition hover:ring-exeter/35"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold leading-snug text-foreground">{type.name}</p>
                                {badge && <p className="mt-1 text-[11px] text-muted">{badge}</p>}
                              </div>
                              {face != null && (
                                <span className="shrink-0 text-[13px] font-bold text-exeter">
                                  {face === 0 ? 'Free' : `~£${face}`}
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {step === 'price' && listing && selectedType && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="rounded-xl bg-surface px-4 py-3 ring-1 ring-divider">
                    <div className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-exeter" strokeWidth={2.5} />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground">{selectedType.name}</p>
                        <p className="mt-1 text-[12px] text-muted">
                          {listing.venue} · {formatWhen(listing.eventDate)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[13px] text-muted">
                    {priceStepHint(selectedType, selectedEvent, listing)}
                  </p>

                  <div className="rounded-xl bg-surface p-4 ring-1 ring-divider">
                    <div className="mb-2 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-exeter" strokeWidth={2} />
                      <p className="text-[13px] font-bold text-foreground">Your ticket file</p>
                    </div>
                    <p className="mb-3 text-[12px] text-muted">
                      Screenshot or PDF. Buyers get it by email. Not public.
                    </p>
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-divider bg-background px-4 py-6 transition hover:border-exeter/40">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                        className="sr-only"
                        onChange={(ev) => {
                          const file = ev.target.files?.[0];
                          if (!file) return;
                          onProofSelected(file);
                          ev.target.value = '';
                        }}
                      />
                      {proofPreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={proofPreview} alt="Ticket preview" className="max-h-40 rounded-lg object-contain" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted" strokeWidth={1.5} />
                      )}
                      <span className="text-center text-[13px] font-semibold text-foreground">
                        {proofFile ? proofFile.name : 'Tap to upload ticket'}
                      </span>
                    </label>
                    {proofError && (
                      <p className="mt-2 text-[12px] text-amber-600 dark:text-amber-400">{proofError}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
                        Your price (£)
                      </label>
                      <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                        inputMode="decimal"
                        required
                        placeholder="0"
                        className="w-full rounded-xl bg-surface px-4 py-3 text-[16px] font-semibold outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">
                        How many
                      </label>
                      <input
                        value={qty}
                        onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
                        inputMode="numeric"
                        required
                        className="w-full rounded-xl bg-surface px-4 py-3 text-[16px] font-semibold outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-exeter py-3.5 text-[14px] font-bold text-white disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Banknote className="h-4 w-4" strokeWidth={2} />
                    )}
                    List on YAP
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
