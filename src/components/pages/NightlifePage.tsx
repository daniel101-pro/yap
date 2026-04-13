'use client';

import { FormEvent, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Ticket, Plus, Clock3 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { NightlifePin } from '@/types';

type NightlifeView = 'tickets' | 'map';
const NightlifeMap = dynamic(() => import('./NightlifeMap'), { ssr: false });

export default function NightlifePage() {
  const { nightlifeTickets, addNightlifeTicket, nightlifePins, addNightlifePin, email } = useStore();
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

  const sortedTickets = useMemo(
    () => [...nightlifeTickets].sort((a, b) => +new Date(a.eventDate) - +new Date(b.eventDate)),
    [nightlifeTickets],
  );
  const mappablePins: NightlifePin[] = (Array.isArray(nightlifePins) ? nightlifePins : []).flatMap((pin) => {
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
  });
  const clubs = mappablePins.filter((pin) => pin.type === 'nightclub');
  const houseParties = mappablePins.filter((pin) => pin.type === 'house-party');

  const handleSellTicket = (e: FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim() || !ticketVenue.trim() || !ticketPrice.trim()) return;
    addNightlifeTicket({
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
      const response = await fetch('/api/stripe/connect/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error ?? 'Could not start Stripe onboarding.');
      }
    } catch {
      alert('Stripe onboarding failed. Please try again.');
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleBuyTicket = async (ticketId: string) => {
    const ticket = sortedTickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    setIsCheckoutLoading(ticketId);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket }),
      });
      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      } else {
        alert(data?.error ?? 'Could not start checkout.');
      }
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

    const submitWithCoords = (lat: number, lng: number) => {
      addNightlifePin({
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
      submitWithCoords(selectedPoint.lat, selectedPoint.lng);
      setIsAddingParty(false);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${partyAddress} Exeter`)}`);
      const rows = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (rows[0]) {
        submitWithCoords(Number(rows[0].lat), Number(rows[0].lon));
      } else {
        // Fallback so the button always works even if geocoding fails.
        submitWithCoords(50.726, -3.53);
      }
    } catch {
      // Fallback to Exeter center if lookup is blocked/rate-limited.
      submitWithCoords(50.726, -3.53);
    } finally {
      setIsAddingParty(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="px-5 pb-6">
      <section className="pb-3 pt-4">
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-light">Nightlife</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Tickets and Party Map</h1>
      </section>

      <div className="mb-4 flex rounded-2xl bg-surface/70 p-1.5">
        <button
          onClick={() => setView('tickets')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
            view === 'tickets' ? 'bg-background text-foreground shadow-sm' : 'text-muted'
          }`}
        >
          <Ticket className="h-4 w-4" />
          Tickets
        </button>
        <button
          onClick={() => setView('map')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
            view === 'map' ? 'bg-background text-foreground shadow-sm' : 'text-muted'
          }`}
        >
          <MapPin className="h-4 w-4" />
          Map
        </button>
      </div>

      {view === 'tickets' ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Buy and Resell Club Tickets</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStripeOnboard}
                disabled={isConnectingStripe}
                className="rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-60"
              >
                {isConnectingStripe ? 'Connecting...' : 'Payout Setup'}
              </button>
              <button
                onClick={() => setShowTicketForm((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-exeter px-3 py-2 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Sell Ticket
              </button>
            </div>
          </div>

          {showTicketForm && (
            <form onSubmit={handleSellTicket} className="mb-4 space-y-2 rounded-2xl bg-surface/55 p-3">
              <input
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                placeholder="Ticket title"
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={ticketVenue}
                  onChange={(e) => setTicketVenue(e.target.value)}
                  placeholder="Venue"
                  className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={ticketPrice}
                  onChange={(e) => setTicketPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="Price (£)"
                  className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
                />
                <input
                  value={ticketQty}
                  onChange={(e) => setTicketQty(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Qty"
                  className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <button type="submit" className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background">
                Post Ticket
              </button>
            </form>
          )}

          <div className="space-y-2">
            {sortedTickets.map((ticket) => (
              <div key={ticket.id} className="rounded-2xl bg-surface/55 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{ticket.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{ticket.venue}</p>
                  </div>
                  <p className="text-lg font-bold text-exeter">£{ticket.price}</p>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-light">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5" />
                    {new Date(ticket.eventDate).toLocaleDateString()}
                  </span>
                  <span>{ticket.quantity ?? 1} ticket(s) • {ticket.status ?? 'active'}</span>
                </div>
                <button
                  onClick={() => handleBuyTicket(ticket.id)}
                  disabled={isCheckoutLoading === ticket.id}
                  className="mt-2 w-full rounded-xl bg-background py-2 text-xs font-semibold text-foreground disabled:opacity-60"
                >
                  {isCheckoutLoading === ticket.id ? 'Opening Checkout...' : 'Buy with Stripe'}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Exeter Night Map</h2>
            <button
              onClick={() => setShowPartyForm((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-exeter px-3 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {showPartyForm ? 'Close Form' : 'Add House Party'}
            </button>
          </div>

          {showPartyForm && (
            <form onSubmit={handleAddHouseParty} className="mb-3 space-y-2 rounded-2xl bg-surface/55 p-3">
              <p className="text-xs text-muted">Tap map for exact pin, or we place it from address.</p>
              <input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder="Party name"
                required
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
              />
              <input
                value={partyAddress}
                onChange={(e) => setPartyAddress(e.target.value)}
                placeholder="Address or area in Exeter"
                required
                className="w-full rounded-xl bg-background px-3 py-2.5 text-sm outline-none"
              />
              {selectedPoint && (
                <p className="text-[11px] text-exeter">
                  Pin selected at {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </p>
              )}
              {formError && <p className="text-[11px] text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={isAddingParty}
                className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-60"
              >
                {isAddingParty ? 'Saving...' : 'Save Party Pin'}
              </button>
            </form>
          )}

          <div className="relative h-[420px] overflow-hidden rounded-3xl bg-surface">
            <NightlifeMap pins={mappablePins} draftPin={selectedPoint} onMapClick={setSelectedPoint} />
          </div>

          <div className="mt-3 space-y-4">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">Nightclubs</h3>
              <div className="space-y-2">
                {clubs.map((pin) => (
                  <div key={pin.id} className="rounded-2xl bg-surface/55 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{pin.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{pin.address}</p>
                      </div>
                      <span className="rounded-full bg-exeter/15 px-2 py-1 text-[10px] font-semibold text-exeter">
                        {pin.isOpen ? 'Open' : 'Closed'}
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${pin.lat},${pin.lng}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-background px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Get Directions
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">House Parties</h3>
              <div className="space-y-2">
                {houseParties.map((pin) => (
                  <div key={pin.id} className="rounded-2xl bg-surface/55 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{pin.name}</p>
                        <p className="mt-0.5 text-xs text-muted">{pin.address}</p>
                      </div>
                      <span className="rounded-full bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-700">
                        House Party
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${pin.lat},${pin.lng}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-background px-3 py-2 text-xs font-semibold text-foreground"
                    >
                      <Navigation className="h-3.5 w-3.5" />
                      Get Directions
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </section>
      )}
    </motion.div>
  );
}
