'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Trash2, CheckCircle2, RotateCcw, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getCategoryIcon } from '@/lib/icons';
import { getConditionLabel } from '@/lib/utils';

export default function MyListingsSection() {
  const {
    listings,
    setSelectedListing,
    deleteListing,
    updateListingSold,
    setShowCreateModal,
    setCreateMode,
  } = useStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const myListings = listings.filter((l) => l.isOwn);

  const handleDelete = async (listingId: string) => {
    setBusyId(listingId);
    try {
      await deleteListing(listingId);
      setConfirmDeleteId(null);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleSold = async (listingId: string, isSold: boolean) => {
    setBusyId(listingId);
    try {
      await updateListingSold(listingId, isSold);
    } finally {
      setBusyId(null);
    }
  };

  const openCreateListing = () => {
    setCreateMode('listing');
    setShowCreateModal(true);
  };

  return (
    <section className="px-5 pb-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.12em] uppercase text-muted-light">
            Your shop
          </p>
          <h2 className="mt-0.5 text-[18px] font-semibold tracking-tight text-foreground">
            What you&apos;re selling
          </h2>
        </div>
        <button
          onClick={openCreateListing}
          className="flex items-center gap-1.5 rounded-full bg-exeter px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-exeter-light"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          List item
        </button>
      </div>

      {myListings.length === 0 ? (
        <div className="rounded-2xl bg-surface/55 px-5 py-8 text-center">
          <Package className="mx-auto mb-3 h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden />
          <p className="text-[14px] font-semibold text-muted">Nothing listed yet</p>
          <p className="mt-1 text-[13px] text-muted-light">
            Post your textbooks, bike, or whatever you&apos;re trying to shift.
          </p>
          <button
            onClick={openCreateListing}
            className="mt-4 rounded-full bg-surface px-4 py-2.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-surface-hover"
          >
            Create your first listing
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {myListings.map((listing, i) => {
            const Icon = getCategoryIcon(listing.category);
            const hasImage = listing.images.length > 0;
            const isBusy = busyId === listing.id;

            return (
              <motion.div
                key={listing.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="rounded-2xl bg-surface/60 p-3 ring-1 ring-divider"
              >
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedListing(listing)}
                    className="relative h-[72px] w-[72px] flex-shrink-0 overflow-hidden rounded-xl bg-surface"
                  >
                    {hasImage ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Icon className="h-7 w-7 text-muted-light" strokeWidth={1.2} />
                      </div>
                    )}
                    {listing.isSold && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[10px] font-bold uppercase tracking-wide text-white">
                        Sold
                      </span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setSelectedListing(listing)}
                      className="text-left"
                    >
                      <h3 className="text-[14px] font-semibold text-foreground line-clamp-1">
                        {listing.title}
                      </h3>
                      <p className="mt-0.5 text-[16px] font-bold tracking-tight text-foreground">
                        £{listing.price}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-light">
                        {getConditionLabel(listing.condition)} · {listing.views} views ·{' '}
                        {listing.saved} saves
                      </p>
                    </button>

                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleToggleSold(listing.id, !listing.isSold)
                        }
                        className="flex items-center gap-1.5 rounded-full bg-background px-3 py-1.5 text-[12px] font-medium text-foreground ring-1 ring-divider transition-colors hover:bg-surface-hover disabled:opacity-50"
                      >
                        {listing.isSold ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                            Mark available
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                            Mark sold
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setConfirmDeleteId(listing.id)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {confirmDeleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDeleteId(null)}
              className="fixed inset-0 z-[60] bg-black/30"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 z-[70] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 text-center shadow-2xl"
              style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}
            >
              <h3 className="mb-2 text-[16px] font-bold text-foreground">Delete listing?</h3>
              <p className="mb-5 text-[13px] text-muted">
                This removes the listing and any messages about it.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 rounded-xl bg-surface py-2.5 text-[13px] font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={busyId === confirmDeleteId}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
