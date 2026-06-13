'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock3, MapPin, Ticket } from 'lucide-react';
import type { NightlifeTicket } from '@/types';
import { formatEventDate, formatEventTime } from '@/lib/utils';

interface NightlifeTicketCardProps {
  ticket: NightlifeTicket;
  index: number;
  isLoading: boolean;
  onBuy: () => void;
}

export default function NightlifeTicketCard({
  ticket,
  index,
  isLoading,
  onBuy,
}: NightlifeTicketCardProps) {
  const isSold = ticket.isSold || ticket.status === 'sold';
  const isReserved = ticket.status === 'reserved';
  const canBuy = !isSold && !isReserved;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0, 0, 0.2, 1] }}
      className="relative overflow-hidden rounded-2xl ring-1 ring-divider"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-[#0c1f1c] via-[#142a35] to-exeter/90" />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(circle at 85% 15%, rgba(0,121,107,0.55), transparent 45%), radial-gradient(circle at 10% 90%, rgba(99,102,241,0.25), transparent 40%)',
        }}
      />

      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/90">
                <Ticket className="h-3 w-3" strokeWidth={2} />
                {ticket.venue}
              </span>
              {isSold && (
                <span className="rounded-full bg-red-500/25 px-2 py-0.5 text-[10px] font-bold uppercase text-red-200">
                  Sold
                </span>
              )}
              {isReserved && (
                <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-100">
                  Reserved
                </span>
              )}
            </div>
            <h3 className="text-[17px] font-bold leading-snug text-white line-clamp-2">
              {ticket.title}
            </h3>
            <p className="mt-1 text-[12px] text-white/60">by {ticket.sellerName}</p>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-black tracking-tight text-white">£{ticket.price}</p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">
              {ticket.quantity ?? 1} left
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-[12px] text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
            {formatEventDate(ticket.eventDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" strokeWidth={2} />
            {formatEventTime(ticket.eventDate)}
          </span>
        </div>

        <button
          type="button"
          onClick={onBuy}
          disabled={!canBuy || isLoading}
          className={`mt-4 w-full rounded-xl py-3 text-[13px] font-bold transition-all ${
            canBuy
              ? 'bg-white text-[#0c1f1c] hover:bg-white/90 active:scale-[0.98]'
              : 'bg-white/15 text-white/40 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {isLoading
            ? 'Opening checkout…'
            : isSold
              ? 'Sold out'
              : isReserved
                ? 'Someone\'s buying'
                : 'Buy secure with Stripe'}
        </button>
      </div>
    </motion.article>
  );
}
