'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Eye, Heart, Star, MessageCircle, User } from 'lucide-react';
import { Listing } from '@/types';
import { useStore } from '@/lib/store';
import { timeAgo, getConditionLabel } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';
import MessageSheet from './MessageSheet';

interface ProductDetailProps {
  listing: Listing;
  onBack: () => void;
  onViewSeller: (sellerId: string) => void;
}

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={i < Math.round(rating) ? 'text-amber-400' : 'text-muted-light'}
          fill={i < Math.round(rating) ? 'currentColor' : 'none'}
          size={size}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

export default function ProductDetail({ listing, onBack, onViewSeller }: ProductDetailProps) {
  const { savedListings, toggleSaveListing, startConversation, activeConversation, setActiveConversation } = useStore();
  const [activeImage, setActiveImage] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const CategoryIcon = getCategoryIcon(listing.category);
  const isSaved = savedListings.includes(listing.id);

  const hasImages = listing.images.length > 0;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveImage(index);
  };

  const handleMessageSeller = () => {
    const convId = startConversation(listing);
    setShowMessage(true);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, filter: 'blur(6px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
        className="flex flex-col min-h-screen bg-background pb-24"
      >
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={onBack}
          className="flex items-center gap-1 px-4 py-4 text-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </motion.button>

        {/* Image carousel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="px-4 mb-6"
        >
          {hasImages ? (
            <>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide rounded-2xl hide-scrollbar"
              >
                {listing.images.map((img, i) => (
                  <div
                    key={i}
                    className="flex-none w-full aspect-square snap-center rounded-2xl overflow-hidden bg-surface border border-divider"
                  >
                    <img
                      src={img}
                      alt={`${listing.title} - image ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              {listing.images.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {listing.images.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        i === activeImage ? 'bg-foreground w-4' : 'bg-foreground/20'
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="aspect-square bg-surface border border-divider rounded-2xl flex items-center justify-center">
              <CategoryIcon className="w-16 h-16 text-muted-light" strokeWidth={1} />
            </div>
          )}
        </motion.div>

        {/* Price */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-4"
        >
          <p className="text-4xl font-bold text-foreground tracking-tight">
            £{listing.price}
          </p>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="px-4 mt-2"
        >
          <h1 className="text-xl font-semibold text-foreground/90 leading-snug">
            {listing.title}
          </h1>
        </motion.div>

        {/* Condition badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="px-4 mt-3"
        >
          <span className="inline-block px-3 py-1 text-xs font-medium text-muted bg-surface border border-divider rounded-full">
            {getConditionLabel(listing.condition)}
          </span>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex items-center gap-4 px-4 mt-4 text-muted-light text-sm"
        >
          <span className="flex items-center gap-1.5">
            <Eye size={14} />
            {listing.views}
          </span>
          <span className="flex items-center gap-1.5">
            <Heart size={14} />
            {listing.saved + (isSaved ? 1 : 0)}
          </span>
          <span>{timeAgo(listing.timestamp)}</span>
        </motion.div>

        {/* Divider */}
        <div className="mx-4 mt-6 mb-6 border-t border-divider" />

        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="px-4"
        >
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">
            Description
          </h2>
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-line">
            {listing.description}
          </p>
        </motion.div>

        {/* Divider */}
        <div className="mx-4 mt-6 mb-6 border-t border-divider" />

        {/* Seller card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="px-4"
        >
          <div className="bg-surface border border-divider rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-surface-hover border border-divider flex items-center justify-center">
                <User size={18} className="text-muted-light" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground/90">
                  {listing.seller.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarRating rating={listing.seller.rating} size={12} />
                  <span className="text-xs text-muted-light">
                    {listing.seller.totalSales} sales
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => onViewSeller(listing.seller.id)}
              className="w-full py-2.5 text-sm font-medium text-muted bg-surface-hover hover:bg-surface border border-divider rounded-xl transition-colors"
            >
              View seller&apos;s items
            </button>
          </div>
        </motion.div>

        {/* Divider */}
        <div className="mx-4 mt-6 mb-6 border-t border-divider" />

        {/* Reviews */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="px-4 mb-8"
        >
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Reviews ({listing.reviews.length})
          </h2>
          {listing.reviews.length === 0 ? (
            <p className="text-sm text-muted-light">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {listing.reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-surface border border-divider rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <StarRating rating={review.rating} size={12} />
                    <span className="text-xs text-muted-light">
                      {timeAgo(review.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70 leading-relaxed mb-2">
                    {review.comment}
                  </p>
                  <p className="text-xs text-muted-light">{review.buyerName}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Bottom sticky bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xl border-t border-divider px-4 py-3 flex items-center gap-3 z-50">
          <button
            onClick={handleMessageSeller}
            className="flex-1 py-3.5 bg-exeter hover:bg-exeter-light text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} />
            Message Seller
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleSaveListing(listing.id)}
            className={`p-3.5 rounded-xl border transition-all duration-200 ${
              isSaved
                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                : 'bg-surface border-divider text-muted hover:text-foreground'
            }`}
          >
            <Heart size={18} fill={isSaved ? 'currentColor' : 'none'} />
          </motion.button>
        </div>
      </motion.div>

      {/* Message Sheet */}
      <AnimatePresence>
        {showMessage && activeConversation && (
          <MessageSheet
            conversationId={activeConversation}
            onClose={() => {
              setShowMessage(false);
              setActiveConversation(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
