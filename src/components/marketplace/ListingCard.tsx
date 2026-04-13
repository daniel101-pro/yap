'use client';

import { motion } from 'framer-motion';
import { Listing } from '@/types';
import { getConditionLabel } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';
import { useStore } from '@/lib/store';

interface ListingCardProps {
  listing: Listing;
  index: number;
}

export default function ListingCard({ listing, index }: ListingCardProps) {
  const { setSelectedListing } = useStore();
  const Icon = getCategoryIcon(listing.category);
  const hasImage = listing.images.length > 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{
        duration: 0.6,
        delay: index * 0.04,
        ease: [0, 0, 0.2, 1],
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setSelectedListing(listing)}
      aria-label={`${listing.title}, £${listing.price}`}
      className="group cursor-pointer"
    >
      {/* Image */}
      <div className="relative mb-3 aspect-[4/5] overflow-hidden rounded-2xl bg-surface transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        {hasImage ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon className="w-10 h-10 text-muted-light" strokeWidth={1} aria-hidden="true" />
          </div>
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          {getConditionLabel(listing.condition)}
        </span>
      </div>

      {/* Info */}
      <div className="px-0.5">
        <h3 className="text-[14px] font-semibold text-foreground/90 leading-snug line-clamp-2 mb-1">
          {listing.title}
        </h3>
        <p className="text-[16px] font-bold tracking-tight text-foreground">
          £{listing.price}
        </p>
        <p className="mt-1 text-[11px] text-muted-light">
          {listing.category.charAt(0).toUpperCase() + listing.category.slice(1)}
        </p>
      </div>
    </motion.article>
  );
}
