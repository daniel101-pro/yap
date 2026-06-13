'use client';

import { motion } from 'framer-motion';
import { Store, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import ListingCard from '@/components/marketplace/ListingCard';
import MarketFilter from '@/components/marketplace/MarketFilter';
import MyListingsSection from '@/components/marketplace/MyListingsSection';
import ProductDetail from '@/components/marketplace/ProductDetail';
import SellerProfile from '@/components/marketplace/SellerProfile';

export default function MarketplacePage() {
  const { listings, marketFilter, selectedListing, setSelectedListing, selectedSellerId, setSelectedSellerId, searchQuery } = useStore();

  let filtered = marketFilter === 'all'
    ? listings
    : listings.filter((l) => l.category === marketFilter);

  // Own listings live in the management section
  filtered = filtered.filter((l) => !l.isOwn);

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
      className="pb-4"
    >
      <section className="px-5 pt-4 pb-2">
        <p className="text-[11px] tracking-[0.12em] uppercase text-muted-light">
          Campus Marketplace
        </p>
        <div className="mt-1.5 flex items-end justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Discover good finds nearby
          </h1>
          <span className="rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted">
            {filtered.length} item{filtered.length === 1 ? '' : 's'}
          </span>
        </div>
      </section>

      <MyListingsSection />

      <section className="px-5 pb-1">
        <h2 className="text-[15px] font-semibold tracking-tight text-foreground">
          Browse campus
        </h2>
      </section>

      <MarketFilter />

      <div className="px-5 pb-4 pt-2">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-3xl bg-surface/55 px-6 py-20 text-center"
          >
            {searchQuery.trim() ? (
              <>
                <Search className="mx-auto mb-4 h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-[15px] font-semibold text-muted">No results found</p>
                <p className="mt-1 text-[13px] text-muted-light">Try a different search term</p>
              </>
            ) : (
              <>
                <Store className="mx-auto mb-4 h-8 w-8 text-muted" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-[15px] font-semibold text-muted">No listings yet</p>
                <p className="mt-1 text-[13px] text-muted-light">Be the first to post something for sale</p>
              </>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((listing, i) => (
              <ListingCard key={listing.id} listing={listing} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
