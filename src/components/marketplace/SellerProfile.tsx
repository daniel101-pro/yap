'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, User, Star } from 'lucide-react';
import { Listing } from '@/types';
import { getConditionLabel } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';

interface SellerProfileProps {
  sellerId: string;
  onBack: () => void;
  listings: Listing[];
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < Math.round(rating) ? 'text-amber-400' : 'text-white/20'}
          fill={i < Math.round(rating) ? 'currentColor' : 'none'}
          size={size}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function SellerProfile({ sellerId, onBack, listings }: SellerProfileProps) {
  const sellerListings = listings.filter((l) => l.seller.id === sellerId);
  const seller = sellerListings[0]?.seller;

  if (!seller) {
    return (
      <motion.div
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5 }}
        className="flex flex-col min-h-screen bg-[#0A0A0A]"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-4 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-white/30">Seller not found</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(6px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
      className="flex flex-col min-h-screen bg-[#0A0A0A]"
    >
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        onClick={onBack}
        className="flex items-center gap-1 px-4 py-4 text-white/60 hover:text-white transition-colors"
      >
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">Back</span>
      </motion.button>

      {/* Seller header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="flex flex-col items-center px-4 pb-8"
      >
        <div className="w-20 h-20 rounded-full bg-white/[0.06] border border-white/[0.04] flex items-center justify-center mb-4">
          <User size={32} className="text-white/30" />
        </div>
        <h1 className="text-xl font-semibold text-white/90 mb-2">
          {seller.name}
        </h1>
        <div className="flex items-center gap-2 mb-2">
          <StarRating rating={seller.rating} size={14} />
          <span className="text-sm text-white/40">
            {seller.rating.toFixed(1)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-white/40">
          <span>{seller.totalSales} sales</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>
            Joined{' '}
            {seller.joinDate.toLocaleDateString('en-GB', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      </motion.div>

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.04]" />

      {/* Listings section */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="px-4 pt-6 pb-8"
      >
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
          Listings ({sellerListings.length})
        </h2>

        {sellerListings.length === 0 ? (
          <p className="text-sm text-white/30">No listings</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sellerListings.map((listing, index) => {
              const Icon = getCategoryIcon(listing.category);
              return (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    duration: 0.6,
                    delay: 0.3 + index * 0.04,
                    ease: [0, 0, 0.2, 1],
                  }}
                  className="group"
                >
                  <div className="aspect-square bg-white/[0.03] border border-white/[0.04] rounded-2xl flex items-center justify-center mb-2 overflow-hidden transition-all duration-300 group-hover:bg-white/[0.06] group-hover:border-white/[0.08]">
                    {listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon
                        className="w-8 h-8 text-white/20"
                        strokeWidth={1}
                      />
                    )}
                  </div>
                  <div className="px-0.5">
                    <h3 className="text-[13px] font-semibold text-white/80 leading-snug line-clamp-2 mb-0.5">
                      {listing.title}
                    </h3>
                    <p className="text-[14px] font-bold text-white tracking-tight">
                      £{listing.price}
                    </p>
                    <p className="text-[11px] text-white/40 mt-0.5">
                      {getConditionLabel(listing.condition)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
