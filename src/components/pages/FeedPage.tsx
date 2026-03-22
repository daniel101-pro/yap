'use client';

import { motion } from 'framer-motion';
import { Inbox, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import PostCard from '@/components/feed/PostCard';
import CategoryFilter from '@/components/feed/CategoryFilter';

export default function FeedPage() {
  const { posts, feedFilter, searchQuery } = useStore();

  let filtered = feedFilter === 'all'
    ? posts
    : posts.filter((p) => p.category === feedFilter);

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) =>
      p.content.toLowerCase().includes(q) ||
      p.poll?.question.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CategoryFilter />

      <div className="px-5">
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
                <Inbox className="w-8 h-8 text-muted mb-4" strokeWidth={1.5} aria-hidden="true" />
                <p className="text-[14px] font-semibold text-muted">Nothing here yet</p>
                <p className="text-[12px] text-muted-light mt-1">Be the first to yap</p>
              </>
            )}
          </motion.div>
        ) : (
          filtered.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} />
          ))
        )}
      </div>
    </motion.div>
  );
}
