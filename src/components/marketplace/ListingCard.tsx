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
      className="cursor-pointer group"
    >
      {/* Image */}
      <div className="aspect-[4/5] bg-white/[0.03] border border-white/[0.04] rounded-2xl overflow-hidden mb-3 transition-all duration-300 group-hover:bg-white/[0.06] group-hover:border-white/[0.08]">
        {hasImage ? (
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon className="w-10 h-10 text-muted-light" strokeWidth={1} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-0.5">
        <h3 className="text-[14px] font-semibold text-foreground/90 leading-snug line-clamp-2 mb-1">
          {listing.title}
        </h3>
        <p className="text-[15px] font-bold text-white tracking-tight">
          £{listing.price}
        </p>
        <p className="text-[11px] text-muted-light mt-1">
          {getConditionLabel(listing.condition)}
        </p>
      </div>
    </motion.article>
  );
}
