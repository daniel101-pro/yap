'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { PostCategory } from '@/types';
import { getCategoryLabel } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';

const categories: (PostCategory | 'all')[] = [
  'all', 'confessions', 'hot-takes', 'questions', 'memes', 'events', 'rants', 'advice',
];

export default function CategoryFilter() {
  const { feedFilter, setFeedFilter } = useStore();

  return (
    <div className="flex gap-1.5 px-5 py-3 overflow-x-auto hide-scrollbar">
      {categories.map((cat) => {
        const isActive = feedFilter === cat;
        const Icon = cat === 'all' ? Sparkles : getCategoryIcon(cat);
        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.95 }}
            onClick={() => setFeedFilter(cat)}
            className={`relative flex items-center gap-1.5 px-3.5 py-[7px] rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-300 ${
              isActive
                ? 'text-white'
                : 'text-muted hover:text-foreground hover:bg-surface'
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="cat-pill"
                className="absolute inset-0 bg-exeter rounded-full"
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
  );
}
