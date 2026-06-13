'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useFeaturedListings } from '@/hooks/useFeedRanking';
import { getCategoryIcon } from '@/lib/icons';

export default function FeaturedListings() {
  const featured = useFeaturedListings(4);
  const { setSelectedListing } = useStore();

  if (featured.length === 0) return null;

  return (
    <section className="px-5 pb-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-exeter" strokeWidth={2} />
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          Picked for you
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1">
        {featured.map((listing, i) => {
          const Icon = getCategoryIcon(listing.category);
          const hasImage = listing.images.length > 0;

          return (
            <motion.button
              key={listing.id}
              type="button"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, duration: 0.35 }}
              onClick={() => setSelectedListing(listing)}
              className="flex-shrink-0 w-[140px] text-left"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface mb-2">
                {hasImage ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Icon className="h-8 w-8 text-muted-light" strokeWidth={1.2} />
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-exeter px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                  Hot
                </span>
              </div>
              <p className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug">
                {listing.title}
              </p>
              <p className="mt-0.5 text-[14px] font-bold text-foreground">£{listing.price}</p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
