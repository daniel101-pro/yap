'use client';

import { motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useStore } from '@/lib/store';
import { MarketCategory } from '@/types';
import { getCategoryLabel } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';

const categories: (MarketCategory | 'all')[] = [
  'all', 'textbooks', 'electronics', 'furniture', 'clothing', 'bikes', 'tickets', 'other',
];

export default function MarketFilter() {
  const { marketFilter, setMarketFilter } = useStore();

  return (
    <div className="px-5">
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-surface/70 p-2 hide-scrollbar">
      {categories.map((cat) => {
        const isActive = marketFilter === cat;
        const Icon = cat === 'all' ? ShoppingBag : getCategoryIcon(cat);
        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setMarketFilter(cat)}
            aria-pressed={isActive}
            className={`relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium transition-all duration-200 ${
              isActive
                ? 'text-white shadow-sm'
                : 'text-muted hover:bg-background/80 hover:text-foreground'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="market-pill"
                className="absolute inset-0 rounded-full bg-exeter"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
            <Icon className="relative w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
            <span className="relative">
              {cat === 'all' ? 'All' : getCategoryLabel(cat)}
            </span>
          </motion.button>
        );
      })}
      </div>
    </div>
  );
}
