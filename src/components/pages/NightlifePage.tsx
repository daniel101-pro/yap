'use client';

import { FormEvent, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { MapPin, Ticket, Plus, Sparkles, Wallet } from 'lucide-react';
import { useStore } from '@/lib/store';
import { NightlifePin } from '@/types';
import NightlifeTicketCard from '@/components/nightlife/NightlifeTicketCard';
import NightlifeVenueCard from '@/components/nightlife/NightlifeVenueCard';
import SellTicketPanel from '@/components/nightlife/SellTicketPanel';
import AddPartyPanel from '@/components/nightlife/AddPartyPanel';

type NightlifeView = 'tickets' | 'map';
const NightlifeMap = dynamic(() => import('./NightlifeMap'), { ssr: false });

export default function NightlifePage() {
  const { nightlifeTickets, addNightlifeTicket, nightlifePins, addNightlifePin, searchQuery } =
    useStore();
  const [view, setView] = useState<NightlifeView>('tickets');
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketVenue, setTicketVenue] = useState('');
  const [ticketPrice, setTicketPrice] = useState('');
  const [ticketQty, setTicketQty] = useState('1');
  const [partyName, setPartyName] = useState('');
  const [partyAddress, setPartyAddress] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [formError, setFormError] = useState('');
  const [isAddingParty, setIsAddingParty] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);

  const sortedTickets = useMemo(() => {
    let tickets = [...nightlifeTickets].sort((a, b) => +new Date(a.eventDate) - +new Date(b.eventDate));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tickets = tickets.filter(
        (t) => t.title.toLowerCase().includes(q) || t.venue.toLowerCase().includes(q),
      );
    }
    return tickets;
  }, [nightlifeTickets, searchQuery]);

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
  const activeTickets = sortedTickets.filter((t) => !t.isSold && t.status !== 'sold').length;

  const handleSellTicket = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketVenue.trim() || !ticketPrice.trim()) return;
    await addNightlifeTicket({
      title: ticketTitle.trim(),
      venue: ticketVenue.trim(),
      price: Number(ticketPrice),
      eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24),
      quantity: Math.max(1, Number(ticketQty) || 1),
    });
    setTicketTitle('');
    setTicketVenue('');
    setTicketPrice('');
    setTicketQty('1');
    setShowTicketForm(false);
  };

  const handleStripeOnboard = async () => {
    setIsConnectingStripe(true);
    try {
      const response = await fetch('/api/stripe/connect/onboard', { method: 'POST' });
      const data = await response.json();
      if (data?.url) window.location.href = data.url;
      else alert(data?.error ?? 'Could not start Stripe onboarding.');
    } catch {
      alert('Stripe onboarding failed. Please try again.');
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleBuyTicket = async (ticketId: string) => {
    setIsCheckoutLoading(ticketId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      });
      const data = await response.json();
      if (data?.url) window.location.href = data.url;
      else alert(data?.error ?? 'Could not start checkout.');
    } catch {
      alert('Checkout failed. Please try again.');
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
                {activeTickets} tickets live
              </span>
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
          const label = tab === 'tickets' ? 'Tickets' : 'Live map';
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
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Ticket exchange</h2>
                <p className="text-[12px] text-muted-light">Safe resale via Stripe</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={handleStripeOnboard}
                  disabled={isConnectingStripe}
                  className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-2 text-[11px] font-semibold text-foreground ring-1 ring-divider disabled:opacity-60"
                >
                  <Wallet className="h-3.5 w-3.5" strokeWidth={2} />
                  {isConnectingStripe ? '…' : 'Payouts'}
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

            {sortedTickets.length === 0 ? (
              <div className="rounded-2xl bg-surface/55 px-6 py-16 text-center ring-1 ring-divider">
                <Sparkles className="mx-auto mb-3 h-9 w-9 text-muted" strokeWidth={1.5} />
                <p className="text-[15px] font-semibold text-foreground">No tickets yet</p>
                <p className="mt-1 text-[13px] text-muted-light">
                  Be the first to list — someone always needs a spare.
                </p>
                <button
                  type="button"
                  onClick={() => setShowTicketForm(true)}
                  className="mt-5 rounded-full bg-exeter px-5 py-2.5 text-[13px] font-bold text-white"
                >
                  List a ticket
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTickets.map((ticket, i) => (
                  <NightlifeTicketCard
                    key={ticket.id}
                    ticket={ticket}
                    index={i}
                    isLoading={isCheckoutLoading === ticket.id}
                    onBuy={() => handleBuyTicket(ticket.id)}
                  />
                ))}
              </div>
            )}
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
                      <NightlifeVenueCard key={pin.id} pin={pin} index={i} />
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

      <SellTicketPanel
        open={showTicketForm}
        onClose={() => setShowTicketForm(false)}
        title={ticketTitle}
        venue={ticketVenue}
        price={ticketPrice}
        qty={ticketQty}
        onTitleChange={setTicketTitle}
        onVenueChange={setTicketVenue}
        onPriceChange={setTicketPrice}
        onQtyChange={setTicketQty}
        onSubmit={handleSellTicket}
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
