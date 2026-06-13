'use client';

import { FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, MapPin } from 'lucide-react';

interface AddPartyPanelProps {
  open: boolean;
  onClose: () => void;
  name: string;
  address: string;
  selectedPoint: { lat: number; lng: number } | null;
  formError: string;
  isSubmitting: boolean;
  onNameChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function AddPartyPanel({
  open,
  onClose,
  name,
  address,
  selectedPoint,
  formError,
  isSubmitting,
  onNameChange,
  onAddressChange,
  onSubmit,
}: AddPartyPanelProps) {
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
                <Home className="h-5 w-5 text-amber-500" strokeWidth={2} />
                <h2 className="text-[16px] font-bold text-foreground">Drop a house party</h2>
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
              <p className="text-[13px] text-muted flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-exeter" strokeWidth={2} />
                Tap the map to pin the exact location, or we&apos;ll guess from the address.
              </p>
              <input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Party name"
                required
                className="w-full rounded-xl bg-surface px-4 py-3 text-[14px] outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
              />
              <input
                value={address}
                onChange={(e) => onAddressChange(e.target.value)}
                placeholder="Street or area in Exeter"
                required
                className="w-full rounded-xl bg-surface px-4 py-3 text-[14px] outline-none ring-1 ring-divider focus:ring-2 focus:ring-exeter/30"
              />
              {selectedPoint && (
                <p className="text-[12px] font-medium text-exeter">
                  Pin placed on map ✓
                </p>
              )}
              {formError && <p className="text-[12px] font-medium text-red-500">{formError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-foreground py-3.5 text-[14px] font-bold text-background disabled:opacity-60"
              >
                {isSubmitting ? 'Adding…' : 'Add to map'}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
