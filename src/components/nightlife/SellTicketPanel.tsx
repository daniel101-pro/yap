'use client';

import { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, Ticket } from 'lucide-react';

interface SellTicketPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  venue: string;
  price: string;
  qty: string;
  onTitleChange: (v: string) => void;
  onVenueChange: (v: string) => void;
  onPriceChange: (v: string) => void;
  onQtyChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function SellTicketPanel({
  open,
  onClose,
  title,
  venue,
  price,
  qty,
  onTitleChange,
  onVenueChange,
  onPriceChange,
  onQtyChange,
  onSubmit,
}: SellTicketPanelProps) {
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
            className="fixed bottom-0 left-0 right-0 z-[70] mx-auto max-w-2xl rounded-t-3xl bg-background shadow-2xl"
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-9 rounded-full bg-muted-light/50" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-divider">
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-exeter" strokeWidth={2} />
                <h2 className="text-[16px] font-bold text-foreground">Sell a ticket</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface"
              >
                <X className="h-4 w-4 text-muted" strokeWidth={2} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-3 p-5 pb-8">
              <p className="text-[13px] text-muted">
                List guestlist, club tickets, or pres — buyers pay through Stripe.
              </p>
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="e.g. 2× Timepiece Friday"
                className="w-full rounded-xl bg-surface px-4 py-3 text-[14px] outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
              />
              <input
                value={venue}
                onChange={(e) => onVenueChange(e.target.value)}
                placeholder="Venue"
                className="w-full rounded-xl bg-surface px-4 py-3 text-[14px] outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={price}
                  onChange={(e) => onPriceChange(e.target.value.replace(/[^0-9.]/g, ''))}
                  placeholder="Price (£)"
                  className="w-full rounded-xl bg-surface px-4 py-3 text-[14px] outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
                />
                <input
                  value={qty}
                  onChange={(e) => onQtyChange(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Quantity"
                  className="w-full rounded-xl bg-surface px-4 py-3 text-[14px] outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
                />
              </div>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-exeter py-3.5 text-[14px] font-bold text-white"
              >
                <Banknote className="h-4 w-4" strokeWidth={2} />
                List ticket
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
