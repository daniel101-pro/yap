'use client';

import { motion } from 'framer-motion';
import { Store, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import ListingCard from '@/components/marketplace/ListingCard';
import MarketFilter from '@/components/marketplace/MarketFilter';
import ProductDetail from '@/components/marketplace/ProductDetail';
import SellerProfile from '@/components/marketplace/SellerProfile';

export default function MarketplacePage() {
  const { listings, marketFilter, selectedListing, setSelectedListing, selectedSellerId, setSelectedSellerId, searchQuery } = useStore();

  let filtered = marketFilter === 'all'
    ? listings
    : listings.filter((l) => l.category === marketFilter);

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((l) =>
      l.title.toLowerCase().includes(q) ||
      l.description.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q)
    );
  }

  // Seller profile view
  if (selectedSellerId) {
    return (
      <SellerProfile
        sellerId={selectedSellerId}
        onBack={() => setSelectedSellerId(null)}
        listings={listings}
      />
    );
  }

  // Product detail view
  if (selectedListing) {
    return (
      <ProductDetail
        listing={selectedListing}
        onBack={() => setSelectedListing(null)}
        onViewSeller={(id) => setSelectedSellerId(id)}
      />
    );
  }

  // Grid view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <MarketFilter />

      <div className="px-5 pb-4">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            {searchQuery.trim() ? (
              <>
                <Search className="w-8 h-8 text-muted mb-4" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-[14px] font-semibold text-muted">No results found</p>
                <p className="text-[12px] text-muted-light mt-1">Try a different search</p>
              </>
            ) : (
              <>
                <Store className="w-8 h-8 text-muted mb-4" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-[14px] font-semibold text-muted">No listings yet</p>
                <p className="text-[12px] text-muted-light mt-1">Be the first to sell something</p>
              </>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7">
            {filtered.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
