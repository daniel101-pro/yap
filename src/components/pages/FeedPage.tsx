'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useRankedFeed } from '@/hooks/useFeedRanking';
import PostCard from '@/components/feed/PostCard';
import CategoryFilter from '@/components/feed/CategoryFilter';
import CommentSheet from '@/components/feed/CommentSheet';

export default function FeedPage() {
  const { feedFilter, searchQuery, selectedPostId, setSelectedPostId } = useStore();
  const ranked = useRankedFeed(feedFilter, searchQuery);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedPostId) return;
    const el = document.getElementById(`post-${selectedPostId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    setCommentPostId(selectedPostId);
    setSelectedPostId(null);
  }, [selectedPostId, setSelectedPostId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <CategoryFilter />

      {!searchQuery.trim() && feedFilter === 'all' && (
        <p className="px-5 pb-2 text-[11px] text-muted-light">
          Ranked by what&apos;s hot on campus right now
        </p>
      )}

      <div className="px-5">
        {ranked.length === 0 ? (
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
          ranked.map((post, i) => (
            <PostCard key={post.id} post={post} index={i} />
          ))
        )}
      </div>

      {commentPostId && (
        <CommentSheet
          postId={commentPostId}
          onClose={() => setCommentPostId(null)}
        />
      )}
    </motion.div>
  );
}
