'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  readSellerDashboardCache,
  writeSellerDashboardCache,
} from '@/lib/seller-dashboard-cache';
import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { isTrustedStripeRedirect } from '@/lib/validation';

type ListingRow = {
  id: string;
  title: string;
  slotLabel: string;
  venue: string;
  price: number;
  status: 'on_sale' | 'reserved' | 'sold';
  eventTitle: string;
  eventKey: string;
  hasProof: boolean;
  proofIsPdf: boolean;
  canEdit: boolean;
};

type EventGroup = {
  eventKey: string;
  eventTitle: string;
  venue: string;
  mnoEventId: string | null;
  eventImageUrl: string | null;
  listingCount: number;
  onSaleCount: number;
  listings: ListingRow[];
};

type DashboardData = {
  connectReady: boolean;
  hasConnectAccount: boolean;
  holdHours: number;
  repCode: string;
  repUses: number;
  listings: ListingRow[];
  eventsByGroup: EventGroup[];
  summary: {
    activeListings: number;
    totalSold: number;
    totalListings: number;
    lifetimeGBP: number;
    pendingGBP: number;
    readyGBP: number;
    paidOutGBP: number;
  };
  sales: Array<{
    id: string;
    title: string;
    venue: string;
    soldAt: string;
    amountGBP: number;
    payoutStatus: 'pending' | 'ready' | 'paid';
    countdownLabel: string;
  }>;
};

type ListingsView = 'event' | 'ticket';

async function readApiJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('Server returned an invalid response. Try again or run database migrations.');
  }
}

export default function SellerDashboardPage() {
  const setShowSellerDashboard = useStore((s) => s.setShowSellerDashboard);
  const userId = useStore((s) => s.userProfile?.id);
  const removeNightlifeTicket = useStore((s) => s.removeNightlifeTicket);
  const patchNightlifeTicket = useStore((s) => s.patchNightlifeTicket);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const dataRef = useRef(data);
  dataRef.current = data;
  const [error, setError] = useState('');
  const [openingStripe, setOpeningStripe] = useState(false);
  const [connectingSetup, setConnectingSetup] = useState(false);
  const [listingsView, setListingsView] = useState<ListingsView>('event');
  const [selectedEventKey, setSelectedEventKey] = useState<string | null>(null);
  const [copiedRep, setCopiedRep] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    if (!dataRef.current) setLoading(true);
    try {
      const res = await fetch('/api/stripe/seller-dashboard', { cache: 'no-store' });
      const json = await readApiJson(res);
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Could not load dashboard');
      }
      const next = json as unknown as DashboardData;
      const uid = useStore.getState().userProfile?.id;
      if (uid) writeSellerDashboardCache(uid, next);
      setData(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load dashboard');
      if (!dataRef.current) setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    const cached = readSellerDashboardCache<DashboardData>(userId);
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setData(null);
      setLoading(true);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load, userId]);

  useEffect(() => {
    if (listingsView === 'ticket') setSelectedEventKey(null);
  }, [listingsView]);

  const selectedEvent = useMemo(
    () => data?.eventsByGroup.find((g) => g.eventKey === selectedEventKey) ?? null,
    [data, selectedEventKey],
  );

  const sortedTickets = useMemo(() => {
    if (!data) return [];
    const order = { on_sale: 0, reserved: 1, sold: 2 };
    return [...data.listings].sort(
      (a, b) => order[a.status] - order[b.status] || a.eventTitle.localeCompare(b.eventTitle),
    );
  }, [data]);

  const patchListingPrice = async (ticketId: string, price: number) => {
    setActionId(ticketId);
    setError('');
    try {
      const res = await fetch(`/api/nightlife/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Could not update price');
      }
      patchNightlifeTicket(ticketId, { price });
      setData((prev) => {
        if (!prev) return prev;
        const listings = prev.listings.map((l) => (l.id === ticketId ? { ...l, price } : l));
        const eventsByGroup = prev.eventsByGroup.map((g) => ({
          ...g,
          listings: g.listings.map((l) => (l.id === ticketId ? { ...l, price } : l)),
        }));
        const next = { ...prev, listings, eventsByGroup };
        if (userId) writeSellerDashboardCache(userId, next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update price');
    } finally {
      setActionId(null);
    }
  };

  const deleteListing = async (ticketId: string) => {
    if (!window.confirm('Remove this listing?')) return;
    setActionId(ticketId);
    setError('');
    try {
      const res = await fetch(`/api/nightlife/tickets/${encodeURIComponent(ticketId)}`, {
        method: 'DELETE',
      });
      const json = await readApiJson(res);
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : 'Could not remove listing');
      }
      removeNightlifeTicket(ticketId);
      setData((prev) => {
        if (!prev) return prev;
        const listings = prev.listings.filter((l) => l.id !== ticketId);
        const eventsByGroup = prev.eventsByGroup
          .map((g) => {
            const nextListings = g.listings.filter((l) => l.id !== ticketId);
            return {
              ...g,
              listings: nextListings,
              listingCount: nextListings.length,
              onSaleCount: nextListings.filter((l) => l.status === 'on_sale').length,
            };
          })
          .filter((g) => g.listings.length > 0);
        if (selectedEventKey && !eventsByGroup.some((g) => g.eventKey === selectedEventKey)) {
          queueMicrotask(() => setSelectedEventKey(null));
        }
        const next = {
          ...prev,
          listings,
          eventsByGroup,
          summary: {
            ...prev.summary,
            totalListings: listings.length,
            activeListings: listings.filter((l) => l.status === 'on_sale').length,
          },
        };
        if (userId) writeSellerDashboardCache(userId, next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove listing');
    } finally {
      setActionId(null);
    }
  };

  const copyRepCode = async () => {
    if (!data?.repCode) return;
    try {
      await navigator.clipboard.writeText(data.repCode);
      setCopiedRep(true);
      window.setTimeout(() => setCopiedRep(false), 2000);
    } catch {
      setError('Could not copy rep code');
    }
  };

  const openStripeExpress = async () => {
    setOpeningStripe(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect/dashboard', { method: 'POST' });
      const json = await readApiJson(res);
      if (isTrustedStripeRedirect(json?.url as string)) window.location.href = json.url as string;
      else setError(typeof json.error === 'string' ? json.error : 'Could not open Stripe');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Stripe');
    } finally {
      setOpeningStripe(false);
    }
  };

  const startPayoutSetup = async () => {
    setConnectingSetup(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      const json = await readApiJson(res);
      if (isTrustedStripeRedirect(json?.url as string)) window.location.href = json.url as string;
      else setError(typeof json.error === 'string' ? json.error : 'Could not start setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start setup');
    } finally {
      setConnectingSetup(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/70 backdrop-blur-2xl shadow-[0_6px_24px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <button
            type="button"
            onClick={() => {
              if (selectedEventKey) {
                setSelectedEventKey(null);
                return;
              }
              setShowSellerDashboard(false);
            }}
            className="flex items-center gap-1 text-sm font-medium text-exeter"
          >
            <ChevronLeft size={20} />
            <span>{selectedEventKey ? 'Events' : 'Nightlife'}</span>
          </button>
          <h1 className="flex-1 text-center text-[17px] font-semibold text-foreground">Seller dashboard</h1>
          <div className="w-16" />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl px-5 py-6 pb-32"
      >
        <div className="mb-6 flex items-center gap-2">
          <Wallet className="h-5 w-5 text-exeter" strokeWidth={2} />
          <p className="text-[13px] text-muted">Balances, listings, and sales</p>
        </div>

        {loading && !data && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-exeter" />
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-[13px] text-red-500 ring-1 ring-red-500/20">
            {error}
          </div>
        )}

        {data && !selectedEventKey && (
          <section className="mb-8">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Balance</h2>
            {!data.hasConnectAccount ? (
              <div className="rounded-2xl bg-surface px-6 py-8 text-center ring-1 ring-divider">
                <p className="text-[16px] font-semibold text-foreground">Set up payouts</p>
                <p className="mt-2 text-[13px] text-muted">Connect Stripe to see pending and paid balances.</p>
                <button
                  type="button"
                  disabled={connectingSetup}
                  onClick={() => void startPayoutSetup()}
                  className="mt-5 rounded-full bg-exeter px-6 py-3 text-[14px] font-bold text-white disabled:opacity-60"
                >
                  {connectingSetup ? 'Opening Stripe…' : 'Set up payouts'}
                </button>
              </div>
            ) : (
              <>
                <p className="mb-4 text-[13px] leading-relaxed text-muted">
                  Money hits your Stripe account{' '}
                  <span className="font-semibold text-foreground">{data.holdHours} hours</span> after each sale.
                  Stripe pays your bank on their usual schedule.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Pending" value={`£${data.summary.pendingGBP.toFixed(2)}`} sub="In hold" />
                  <StatCard label="Releasing" value={`£${data.summary.readyGBP.toFixed(2)}`} sub="Past 24h" />
                  <StatCard label="Paid out" value={`£${data.summary.paidOutGBP.toFixed(2)}`} sub="To Stripe" />
                  <StatCard label="All time" value={`£${data.summary.lifetimeGBP.toFixed(2)}`} sub="Gross sales" />
                </div>
                <button
                  type="button"
                  disabled={openingStripe || !data.connectReady}
                  onClick={() => void openStripeExpress()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-surface py-3.5 text-[14px] font-semibold text-foreground ring-1 ring-divider disabled:opacity-50"
                >
                  {openingStripe ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
                  )}
                  Bank & tax in Stripe
                </button>
              </>
            )}
          </section>
        )}

        {data && !selectedEventKey && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">Your listings</h2>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted">
                <span>{data.summary.activeListings} on sale</span>
                <span>·</span>
                <span>{data.summary.totalSold} sold</span>
              </div>
            </div>
            <div className="flex rounded-full bg-surface p-0.5 ring-1 ring-divider">
              <ToggleChip
                active={listingsView === 'event'}
                onClick={() => setListingsView('event')}
                label="Events"
              />
              <ToggleChip
                active={listingsView === 'ticket'}
                onClick={() => setListingsView('ticket')}
                label="Tickets"
              />
            </div>
          </div>
        )}

        {data && selectedEvent && (
          <div className="mb-5 flex items-center gap-3">
            <EventAvatar imageUrl={selectedEvent.eventImageUrl} venue={selectedEvent.venue} size="lg" />
            <div className="min-w-0">
              <p className="text-[16px] font-bold leading-snug text-foreground">{selectedEvent.eventTitle}</p>
              <p className="text-[13px] text-muted">{selectedEvent.venue}</p>
            </div>
          </div>
        )}

        {data && data.listings.length === 0 && !selectedEventKey && (
          <p className="mb-8 rounded-2xl bg-surface/60 py-12 text-center text-[13px] text-muted ring-1 ring-divider">
            No listings yet. Sell a ticket from Events.
          </p>
        )}

        {data && listingsView === 'ticket' && data.listings.length > 0 && (
          <ul className="mb-8 space-y-4">
            {sortedTickets.map((row) => (
              <TicketManageCard
                key={row.id}
                row={row}
                busy={actionId === row.id}
                onSavePrice={(price) => void patchListingPrice(row.id, price)}
                onDelete={() => void deleteListing(row.id)}
              />
            ))}
          </ul>
        )}

        {data && listingsView === 'event' && !selectedEventKey && data.eventsByGroup.length > 0 && (
          <ul className="mb-8 space-y-3">
            {data.eventsByGroup.map((group) => (
              <li key={group.eventKey}>
                <button
                  type="button"
                  onClick={() => setSelectedEventKey(group.eventKey)}
                  className="flex w-full items-center gap-4 rounded-2xl bg-surface px-4 py-3 text-left ring-1 ring-divider transition hover:ring-exeter/40"
                >
                  <EventAvatar imageUrl={group.eventImageUrl} venue={group.venue} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold leading-snug text-foreground line-clamp-2">
                      {group.eventTitle}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">{group.venue}</p>
                    <p className="mt-1 text-[11px] font-semibold text-muted-light">
                      {group.onSaleCount} on sale · {group.listingCount} total
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {data && selectedEvent && (
          <ul className="mb-8 space-y-2">
            {selectedEvent.listings.map((row) => (
              <EventSlotRow
                key={row.id}
                row={row}
                busy={actionId === row.id}
                onSavePrice={(price) => void patchListingPrice(row.id, price)}
                onDelete={() => void deleteListing(row.id)}
              />
            ))}
          </ul>
        )}

        {data && !selectedEventKey && data.hasConnectAccount && (
          <section className="mb-8">
            <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-muted">Recent sales</h2>
            {data.sales.length === 0 ? (
              <p className="rounded-2xl bg-surface/60 py-12 text-center text-[13px] text-muted ring-1 ring-divider">
                No sales yet. List a ticket on Events.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.sales.map((sale) => (
                  <li
                    key={sale.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-divider"
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold leading-snug text-foreground line-clamp-2">
                        {sale.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted">{sale.venue}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-bold text-foreground">£{sale.amountGBP.toFixed(2)}</p>
                      <PayoutBadge status={sale.payoutStatus} label={sale.countdownLabel} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {data && !selectedEventKey && (
          <section className="mb-8 rounded-2xl bg-surface px-5 py-4 ring-1 ring-divider">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Your rep code</p>
                <p className="mt-1 font-mono text-[22px] font-black tracking-wide text-foreground">
                  {data.repCode}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  Buyers can enter this at checkout. Each completed sale with your code counts here.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyRepCode()}
                className="flex shrink-0 items-center gap-1 rounded-full bg-background px-3 py-2 text-[12px] font-semibold text-foreground ring-1 ring-divider"
              >
                <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                {copiedRep ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-background/80 px-3 py-2.5">
              <Users className="h-4 w-4 text-exeter" strokeWidth={2} />
              <span className="text-[13px] font-semibold text-foreground">{data.repUses}</span>
              <span className="text-[13px] text-muted">
                {data.repUses === 1 ? 'use' : 'uses'} of your rep code
              </span>
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
}

function EventAvatar({
  imageUrl,
  venue,
  size,
}: {
  imageUrl: string | null;
  venue: string;
  size: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-[72px] w-[72px]' : 'h-14 w-14';
  const ring = 'ring-2 ring-exeter/30 ring-offset-2 ring-offset-background';
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ${ring}`}
      />
    );
  }
  return (
    <div
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-exeter/15 text-exeter ${ring}`}
    >
      <span className="text-[13px] font-black uppercase">{venue.slice(0, 2)}</span>
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
        active ? 'bg-exeter text-white' : 'text-muted'
      }`}
    >
      {label}
    </button>
  );
}

function SaleStatusBadge({ status }: { status: 'on_sale' | 'reserved' | 'sold' }) {
  if (status === 'sold') {
    return <span className="text-[10px] font-bold uppercase text-red-500">Sold</span>;
  }
  if (status === 'reserved') {
    return <span className="text-[10px] font-bold uppercase text-amber-500">Reserved</span>;
  }
  return <span className="text-[10px] font-bold uppercase text-exeter">On sale</span>;
}

function PriceEditor({
  price,
  canEdit,
  busy,
  onSave,
}: {
  price: number;
  canEdit: boolean;
  busy: boolean;
  onSave: (price: number) => void;
}) {
  const [draft, setDraft] = useState(price.toFixed(2));
  useEffect(() => {
    setDraft(price.toFixed(2));
  }, [price]);

  if (!canEdit) {
    return <p className="text-[15px] font-bold text-foreground">£{price.toFixed(2)}</p>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center rounded-lg bg-background ring-1 ring-divider">
        <span className="pl-2 text-[13px] text-muted">£</span>
        <input
          type="text"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.]/g, ''))}
          className="w-16 bg-transparent py-1.5 pr-2 text-[14px] font-semibold text-foreground outline-none"
        />
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const n = Number.parseFloat(draft);
          if (Number.isFinite(n) && n >= 0.5) onSave(n);
        }}
        className="rounded-full bg-exeter px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
      >
        {busy ? '…' : 'Save'}
      </button>
    </div>
  );
}

function EventSlotRow({
  row,
  busy,
  onSavePrice,
  onDelete,
}: {
  row: ListingRow;
  busy: boolean;
  onSavePrice: (price: number) => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-xl bg-surface px-4 py-3 ring-1 ring-divider">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-foreground">{row.slotLabel}</p>
          <div className="mt-1">
            <SaleStatusBadge status={row.status} />
          </div>
        </div>
        <PriceEditor price={row.price} canEdit={row.canEdit} busy={busy} onSave={onSavePrice} />
      </div>
      {row.canEdit && (
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-red-500 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
          Remove listing
        </button>
      )}
    </li>
  );
}

function TicketProofPreview({ ticketId, expectPdf }: { ticketId: string; expectPdf: boolean }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [isPdf, setIsPdf] = useState(expectPdf);

  useEffect(() => {
    let blobUrl: string | null = null;
    setLoading(true);
    setFailed(false);
    setIsPdf(expectPdf);
    setObjectUrl(null);

    fetch(`/api/nightlife/tickets/${encodeURIComponent(ticketId)}/proof-image`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('proof unavailable');
        const blob = await res.blob();
        if (blob.type.includes('pdf')) {
          setIsPdf(true);
          return;
        }
        blobUrl = URL.createObjectURL(blob);
        setObjectUrl(blobUrl);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [ticketId, expectPdf]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-exeter" />
      </div>
    );
  }

  if (isPdf) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-background py-10 text-[13px] text-muted ring-1 ring-divider">
        <Calendar className="h-5 w-5" strokeWidth={2} />
        PDF ticket on file
      </div>
    );
  }

  if (failed || !objectUrl) {
    return <p className="py-8 text-center text-[13px] text-muted">Could not load preview</p>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={objectUrl}
      alt="Your ticket upload"
      className="mx-auto max-h-56 w-full rounded-xl object-contain bg-black/5"
    />
  );
}

function TicketManageCard({
  row,
  busy,
  onSavePrice,
  onDelete,
}: {
  row: ListingRow;
  busy: boolean;
  onSavePrice: (price: number) => void;
  onDelete: () => void;
}) {
  return (
    <li className="overflow-hidden rounded-2xl bg-surface ring-1 ring-divider">
      <div className="border-b border-divider px-4 py-2.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{row.eventTitle}</p>
        <p className="text-[14px] font-semibold text-foreground">{row.slotLabel}</p>
        <p className="text-[12px] text-muted">{row.venue}</p>
      </div>
      <div className="p-4">
        {row.hasProof ? (
          <TicketProofPreview ticketId={row.id} expectPdf={row.proofIsPdf} />
        ) : (
          <p className="py-8 text-center text-[13px] text-muted">No preview</p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <SaleStatusBadge status={row.status} />
          <PriceEditor price={row.price} canEdit={row.canEdit} busy={busy} onSave={onSavePrice} />
        </div>
        {row.canEdit && (
          <button
            type="button"
            disabled={busy}
            onClick={onDelete}
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl bg-red-500/10 py-2.5 text-[13px] font-semibold text-red-500 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} />
            Delete listing
          </button>
        )}
      </div>
    </li>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-4 ring-1 ring-divider">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-[22px] font-black tracking-tight text-foreground">{value}</p>
      <p className="text-[11px] text-muted-light">{sub}</p>
    </div>
  );
}

function PayoutBadge({
  status,
  label,
}: {
  status: 'pending' | 'ready' | 'paid';
  label: string;
}) {
  if (status === 'paid') {
    return <p className="mt-0.5 text-[10px] font-bold uppercase text-exeter">Paid out</p>;
  }
  if (status === 'ready') {
    return <p className="mt-0.5 text-[10px] font-bold uppercase text-amber-500">Sending</p>;
  }
  return (
    <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-muted">
      <Clock className="h-3 w-3" strokeWidth={2} />
      {label}
    </p>
  );
}
