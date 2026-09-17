'use client';

import { FormEvent, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Ticket, Plus, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { NightlifePin } from '@/types';
import NightlifeVenueCard from '@/components/nightlife/NightlifeVenueCard';
import NightlifeMnoEventsBrowse from '@/components/nightlife/NightlifeMnoEventsBrowse';
import SellTicketPanel, { type MnoSellSeed, type SellTicketPayload } from '@/components/nightlife/SellTicketPanel';
import {
  NightlifeMnoEventSheet,
  NightlifeVenueEventsSheet,
} from '@/components/nightlife/NightlifeMnoSheets';
import type { MnoEventDetail } from '@/lib/mynightout';
import AddPartyPanel from '@/components/nightlife/AddPartyPanel';
import { isTrustedStripeRedirect } from '@/lib/validation';
import { writeSellerDashboardCache } from '@/lib/seller-dashboard-cache';

type NightlifeView = 'tickets' | 'map';
const NightlifeMap = dynamic(() => import('./NightlifeMap'), { ssr: false });
const NIGHTLIFE_REP_STORAGE = 'yap-nightlife-rep-code';
const IS_DEV = process.env.NODE_ENV === 'development';

function normalizeCheckoutRepCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12);
}

export default function NightlifePage() {
  const nightlifeTickets = useStore((s) => s.nightlifeTickets);
  const addNightlifeTicket = useStore((s) => s.addNightlifeTicket);
  const nightlifePins = useStore((s) => s.nightlifePins);
  const addNightlifePin = useStore((s) => s.addNightlifePin);
  const searchQuery = useStore((s) => s.searchQuery);
  const [view, setView] = useState<NightlifeView>('tickets');

  useEffect(() => {
    if (searchQuery.trim()) setView('tickets');
  }, [searchQuery]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [formError, setFormError] = useState('');
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);
  const [stripeNotice, setStripeNotice] = useState<string | null>(null);
  const stripeSellerStatus = useStore((s) => s.stripeSellerStatus);
  const refreshStripeSellerStatus = useStore((s) => s.refreshStripeSellerStatus);
  const stripeEnabled = stripeSellerStatus?.enabled ?? null;
  const stripeOnboardingComplete = stripeSellerStatus?.onboardingComplete ?? false;
  const stripeHasConnect = stripeSellerStatus?.connectAccount ?? false;
  const stripeWebhooks = stripeSellerStatus?.webhooks ?? true;
  const [venueEventsPin, setVenueEventsPin] = useState<NightlifePin | null>(null);
  const [mnoEventId, setMnoEventId] = useState<string | null>(null);
  const [checkoutRepCode, setCheckoutRepCode] = useState('');
  const [mnoSellSeed, setMnoSellSeed] = useState<MnoSellSeed | null>(null);
  const setShowSellerDashboard = useStore((s) => s.setShowSellerDashboard);

  useEffect(() => {
    void refreshStripeSellerStatus();
    if (sessionStorage.getItem('yap-stripe-onboarding-complete')) {
      sessionStorage.removeItem('yap-stripe-onboarding-complete');
      setShowSellerDashboard(true);
      const t = window.setTimeout(() => void refreshStripeSellerStatus(), 400);
      return () => window.clearTimeout(t);
    }
  }, [refreshStripeSellerStatus, setShowSellerDashboard]);

  useEffect(() => {
    if (!stripeOnboardingComplete) return;
    fetch('/api/stripe/seller-dashboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) writeSellerDashboardCache(d);
      })
      .catch(() => undefined);
  }, [stripeOnboardingComplete]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(NIGHTLIFE_REP_STORAGE);
      if (stored) setCheckoutRepCode(normalizeCheckoutRepCode(stored));
    } catch {
      /* ignore */
    }
    const repParam = new URLSearchParams(window.location.search).get('rep');
    if (repParam) {
      const normalized = normalizeCheckoutRepCode(repParam);
      setCheckoutRepCode(normalized);
      try {
        localStorage.setItem(NIGHTLIFE_REP_STORAGE, normalized);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const handleCheckoutRepCodeChange = (value: string) => {
    const normalized = normalizeCheckoutRepCode(value);
    setCheckoutRepCode(normalized);
    try {
      if (normalized) localStorage.setItem(NIGHTLIFE_REP_STORAGE, normalized);
      else localStorage.removeItem(NIGHTLIFE_REP_STORAGE);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onFocus = () => void refreshStripeSellerStatus();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [refreshStripeSellerStatus]);

  const mappablePins: NightlifePin[] = (Array.isArray(nightlifePins) ? nightlifePins : []).flatMap(
    (pin) => {
      if (!pin || typeof pin !== 'object') return [];
      const lat = Number((pin as { lat?: number }).lat);
      const lng = Number((pin as { lng?: number }).lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
      return [{
        ...pin,
        lat,
        lng,
        name: pin.name || 'Nightlife Spot',
        address: pin.address || 'Exeter',
        type: pin.type === 'nightclub' ? 'nightclub' as const : 'house-party' as const,
      }];
    },
  );

  const clubs = mappablePins.filter((pin) => pin.type === 'nightclub');
  const houseParties = mappablePins.filter((pin) => pin.type === 'house-party');
  const handleSellTicket = async (ticket: SellTicketPayload) => {
    await addNightlifeTicket({
      title: ticket.title,
      venue: ticket.venue,
      price: ticket.price,
      eventDate: ticket.eventDate,
      quantity: ticket.quantity,
      ticketProofMime: ticket.ticketProofMime,
      ...(ticket.eventEndDate ? { eventEndDate: ticket.eventEndDate } : {}),
      ...(ticket.mnoEventId ? { mnoEventId: ticket.mnoEventId } : {}),
      ...(ticket.mnoTicketId ? { mnoTicketId: ticket.mnoTicketId } : {}),
      ...(ticket.ticketProofUrl ? { ticketProofUrl: ticket.ticketProofUrl } : {}),
      ...(ticket.ticketProofBase64 ? { ticketProofBase64: ticket.ticketProofBase64 } : {}),
    });
    setShowTicketForm(false);
  };

  const openMnoEvent = (eventId: string) => {
    setMnoEventId(eventId);
  };

  const handleSellForMnoEvent = (event: MnoEventDetail, slotId?: string) => {
    setMnoSellSeed({ eventId: event.id, slotId });
    setMnoEventId(null);
    setShowTicketForm(true);
  };

  const openStripeConnect = async (path: 'onboard' | 'dashboard') => {
    if (stripeEnabled === false) {
      setStripeNotice('Payouts are not live on this server yet. Check back soon.');
      return;
    }
    setStripeNotice(null);
    setIsConnectingStripe(true);
    try {
      const response = await fetch(`/api/stripe/connect/${path}`, { method: 'POST' });
      const data = await response.json();
      if (isTrustedStripeRedirect(data?.url)) window.location.href = data.url;
      else setStripeNotice(data?.error ?? 'Could not open Stripe. Try again in a moment.');
    } catch {
      setStripeNotice('Could not connect to payments. Check your network and try again.');
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleStripePayouts = async () => {
    let status = stripeSellerStatus;
    if (!status) {
      await refreshStripeSellerStatus();
      status = useStore.getState().stripeSellerStatus;
    }
    if (status?.enabled === false) {
      setStripeNotice('Payouts are not live on this server yet. Check back soon.');
      return;
    }
    if (status?.connectAccount && status.onboardingComplete) {
      setShowSellerDashboard(true);
      return;
    }
    void openStripeConnect('onboard');
  };

  const payoutButtonLabel = () => {
    if (isConnectingStripe) return '…';
    if (!stripeSellerStatus) return 'Payouts';
    if (stripeEnabled === false) return 'Payouts soon';
    if (stripeOnboardingComplete) return 'Dashboard';
    if (stripeHasConnect) return 'Continue setup';
    return 'Set up payouts';
  };

  const handleBuyTicket = async (ticketId: string) => {
    if (stripeEnabled === false) {
      setStripeNotice('Checkout is not live yet. Browsing still works.');
      return;
    }
    if (IS_DEV && !stripeWebhooks) {
      setStripeNotice(
        'Local checkout needs webhooks: run npm run stripe:listen, put whsec_… in .env, restart dev, keep that terminal open.',
      );
      return;
    }
    setStripeNotice(null);
    setIsCheckoutLoading(ticketId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId,
          ...(checkoutRepCode ? { repCode: checkoutRepCode } : {}),
        }),
      });
      const data = await response.json();
      if (isTrustedStripeRedirect(data?.url)) window.location.href = data.url;
      else setStripeNotice(data?.error ?? 'Could not start checkout.');
    } catch {
      setStripeNotice('Checkout failed. Check your connection and try again.');
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  const handleAddHouseParty = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!partyName.trim() || !partyAddress.trim()) {
      setFormError('Add party name and address.');
      return;
    }
    setIsAddingParty(true);

    const submitWithCoords = async (lat: number, lng: number) => {
      await addNightlifePin({
        name: partyName.trim(),
        type: 'house-party',
        address: partyAddress.trim(),
        mapsQuery: `${partyName.trim()} ${partyAddress.trim()} Exeter`,
        lat,
        lng,
      });
      setPartyName('');
      setPartyAddress('');
      setSelectedPoint(null);
      setShowPartyForm(false);
    };

    if (selectedPoint) {
      await submitWithCoords(selectedPoint.lat, selectedPoint.lng);
      setIsAddingParty(false);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${partyAddress} Exeter`)}`,
      );
      const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (rows[0]) await submitWithCoords(Number(rows[0].lat), Number(rows[0].lon));
      else await submitWithCoords(50.726, -3.53);
    } catch {
      await submitWithCoords(50.726, -3.53);
    } finally {
      setIsAddingParty(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-5 pb-8"
    >
      {/* Hero */}
      <section className="pt-4 pb-5">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 ring-1 ring-white/10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#060f14] via-[#0f2430] to-exeter" />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                'radial-gradient(circle at 20% 30%, rgba(0,121,107,0.5), transparent 50%), radial-gradient(circle at 80% 70%, rgba(139,92,246,0.2), transparent 45%)',
            }}
          />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/50">
              Exeter nightlife
            </p>
            <h1 className="mt-1 text-[26px] font-black tracking-tight text-white leading-tight">
              After dark
            </h1>
            <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-white/65">
              Snag tickets, find house parties, and see what&apos;s open tonight.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                {houseParties.length} parties
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/90">
                {clubs.length} clubs
              </span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Tabs */}
      <div className="mb-5 flex rounded-2xl bg-surface/80 p-1 ring-1 ring-divider">
        {(['tickets', 'map'] as NightlifeView[]).map((tab) => {
          const active = view === tab;
          const Icon = tab === 'tickets' ? Ticket : MapPin;
          const label = tab === 'tickets' ? 'Events' : 'Live map';
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setView(tab)}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold transition-colors ${
                active ? 'text-foreground' : 'text-muted'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="nightlife-tab"
                  className="absolute inset-0 rounded-xl bg-background shadow-sm ring-1 ring-divider"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon className="h-4 w-4" strokeWidth={2} />
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {view === 'tickets' ? (
          <motion.section
            key="tickets"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
          >
            {stripeEnabled === false && (
              <div className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-[12px] leading-relaxed text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
                Payments coming soon. You can still list tickets and use the map.
              </div>
            )}

            {IS_DEV && stripeEnabled && !stripeWebhooks && (
              <div className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-[12px] leading-relaxed text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200">
                <strong>Local only:</strong> run{' '}
                <code className="rounded bg-black/10 px-1">npm run stripe:listen</code>, add{' '}
                <code className="rounded bg-black/10 px-1">whsec_…</code> to{' '}
                <code className="rounded bg-black/10 px-1">.env</code>, restart dev, keep listen running for checkout tests.
              </div>
            )}

            {stripeNotice && (
              <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-[12px] leading-relaxed text-red-600 ring-1 ring-red-500/20 dark:text-red-400">
                {stripeNotice}
              </div>
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">
                  {searchQuery.trim() ? 'Search results' : 'Events'}
                </h2>
                <p className="text-[12px] text-muted-light">
                  {searchQuery.trim()
                    ? `Matching "${searchQuery.trim()}"`
                    : 'Tap a night for entry times and resale.'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleStripePayouts}
                  disabled={isConnectingStripe || stripeEnabled === false}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold disabled:opacity-50 ${
                    stripeOnboardingComplete
                      ? 'bg-exeter/10 text-exeter ring-1 ring-exeter/30'
                      : 'bg-surface text-foreground ring-1 ring-divider'
                  }`}
                >
                  <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
                  {payoutButtonLabel()}
                </button>
                <button
                  type="button"
                  onClick={() => setShowTicketForm(true)}
                  className="flex items-center gap-1.5 rounded-full bg-exeter px-3.5 py-2 text-[11px] font-bold text-white shadow-[0_4px_16px_rgba(0,121,107,0.35)]"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Sell
                </button>
              </div>
            </div>

            <NightlifeMnoEventsBrowse searchQuery={searchQuery} onSelectEvent={openMnoEvent} />
          </motion.section>
        ) : (
          <motion.section
            key="map"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Exeter live map</h2>
                <p className="text-[12px] text-muted-light">Tap map to drop a pin</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPartyForm(true)}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 px-3.5 py-2 text-[11px] font-bold text-white shadow-[0_4px_16px_rgba(245,158,11,0.35)]"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                Add party
              </button>
            </div>

            <div className="relative overflow-hidden rounded-3xl ring-1 ring-divider shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
              <div className="absolute left-3 top-3 z-[1000] flex gap-2">
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold text-exeter backdrop-blur-sm ring-1 ring-divider">
                  🎵 Clubs
                </span>
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] font-bold text-amber-600 backdrop-blur-sm ring-1 ring-divider">
                  🏠 Parties
                </span>
              </div>
              <div className="h-[min(420px,55vh)]">
                <NightlifeMap
                  pins={mappablePins}
                  draftPin={selectedPoint}
                  onMapClick={setSelectedPoint}
                  onOpenVenueEvents={setVenueEventsPin}
                />
              </div>
            </div>

            <div className="mt-5 space-y-5">
              {clubs.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    Nightclubs
                  </h3>
                  <div className="space-y-3">
                    {clubs.map((pin, i) => (
                      <NightlifeVenueCard
                        key={pin.id}
                        pin={pin}
                        index={i}
                        onOpenEvents={setVenueEventsPin}
                      />
                    ))}
                  </div>
                </div>
              )}

              {houseParties.length > 0 && (
                <div>
                  <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    House parties
                  </h3>
                  <div className="space-y-3">
                    {houseParties.map((pin, i) => (
                      <NightlifeVenueCard key={pin.id} pin={pin} index={i} />
                    ))}
                  </div>
                </div>
              )}

              {clubs.length === 0 && houseParties.length === 0 && (
                <div className="rounded-2xl bg-surface/55 px-6 py-12 text-center ring-1 ring-divider">
                  <MapPin className="mx-auto mb-3 h-8 w-8 text-muted" strokeWidth={1.5} />
                  <p className="text-[14px] font-semibold text-muted">Map warming up</p>
                  <p className="mt-1 text-[12px] text-muted-light">Add the first house party</p>
                </div>
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <NightlifeVenueEventsSheet
        pin={venueEventsPin}
        open={Boolean(venueEventsPin) && !mnoEventId}
        onClose={() => setVenueEventsPin(null)}
        onSelectEvent={openMnoEvent}
      />

      <NightlifeMnoEventSheet
        eventId={mnoEventId}
        open={Boolean(mnoEventId)}
        onClose={() => {
          setMnoEventId(null);
          setVenueEventsPin(null);
        }}
        onBack={
          venueEventsPin
            ? () => setMnoEventId(null)
            : undefined
        }
        yapTickets={nightlifeTickets}
        onBuyYap={handleBuyTicket}
        checkoutLoadingId={isCheckoutLoading}
        onSellForEvent={handleSellForMnoEvent}
        repCode={checkoutRepCode}
        onRepCodeChange={handleCheckoutRepCodeChange}
      />

      <SellTicketPanel
        open={showTicketForm}
        onClose={() => setShowTicketForm(false)}
        onSubmit={handleSellTicket}
        mnoSellSeed={mnoSellSeed}
        onMnoSellSeedConsumed={() => setMnoSellSeed(null)}
      />

      <AddPartyPanel
        open={showPartyForm}
        onClose={() => setShowPartyForm(false)}
        name={partyName}
        address={partyAddress}
        selectedPoint={selectedPoint}
        formError={formError}
        isSubmitting={isAddingParty}
        onNameChange={setPartyName}
        onAddressChange={setPartyAddress}
        onSubmit={handleAddHouseParty}
      />
    </motion.div>
  );
}
