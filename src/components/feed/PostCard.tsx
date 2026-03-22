'use client';

import { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { Post, Reaction } from '@/types';
import { useStore } from '@/lib/store';
import { timeAgo, getCategoryLabel, formatNumber } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';
import ReactionButton from '@/components/ui/ReactionButton';
import PollCard from './PollCard';

interface PostCardProps {
  post: Post;
  index: number;
}

const reactions: Reaction[] = ['fire', 'cap', 'dead', 'real', 'sus'];

export default function PostCard({ post, index }: PostCardProps) {
  const { reactToPost } = useStore();
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  const CategoryIcon = getCategoryIcon(post.category);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveMediaIndex(index);
  }, []);

  const mediaItems = post.media?.length ? post.media : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{
        duration: 0.6,
        delay: index * 0.04,
        ease: [0, 0, 0.2, 1],
      }}
      aria-label={`${getCategoryLabel(post.category)} post`}
      className="py-5 border-b border-white/[0.04] last:border-b-0"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-exeter/10 flex items-center justify-center">
            <CategoryIcon className="w-3.5 h-3.5 text-exeter" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <span className="text-[12px] font-semibold text-exeter tracking-[0.04em] uppercase">
            {getCategoryLabel(post.category)}
          </span>
        </div>
        <time className="text-[12px] text-muted-light">{timeAgo(post.timestamp)}</time>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-[15px] leading-[1.65] text-foreground/90 mb-4">
          {post.content}
        </p>
      )}

      {/* Poll */}
      {post.poll && <PollCard poll={post.poll} />}

      {/* Media */}
      {mediaItems && (
        <div className="mt-3 mb-1 rounded-2xl overflow-hidden bg-white/[0.03]">
          {mediaItems.length === 1 ? (
            mediaItems[0].type === 'video' ? (
              <video
                src={mediaItems[0].url}
                controls
                muted
                playsInline
                className="aspect-[16/10] object-cover w-full"
              />
            ) : (
              <img
                src={mediaItems[0].url}
                alt=""
                className="aspect-[16/10] object-cover w-full"
              />
            )
          ) : (
            <>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-1 overflow-x-auto snap-x snap-mandatory hide-scrollbar"
              >
                {mediaItems.map((item, i) => (
                  <div key={i} className="min-w-full snap-center">
                    {item.type === 'video' ? (
                      <video
                        src={item.url}
                        controls
                        muted
                        playsInline
                        className="aspect-[16/10] object-cover w-full"
                      />
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="aspect-[16/10] object-cover w-full"
                      />
                    )}
                  </div>
                ))}
              </div>
              {/* Dots indicator */}
              <div className="flex justify-center gap-1.5 py-2">
                {mediaItems.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
                      i === activeMediaIndex ? 'bg-white/70' : 'bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Reactions */}
      <div className="flex items-center gap-1.5 mt-4 flex-wrap" role="group" aria-label="Reactions">
        {reactions.map((r) => (
          <ReactionButton
            key={r}
            reaction={r}
            count={post.reactions[r]}
            isActive={post.userReaction === r}
            onReact={() => reactToPost(post.id, r)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3">
        <button
          aria-label={`${post.commentCount} comments`}
          className="flex items-center gap-1.5 text-muted-light hover:text-foreground transition-colors duration-200 min-h-[44px] min-w-[44px]"
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-[12px] font-medium">{post.commentCount}</span>
        </button>
        <span className="text-[11px] text-muted-light" aria-label={`${formatNumber(totalReactions)} total reactions`}>
          {formatNumber(totalReactions)} reactions
        </span>
      </div>
    </motion.article>
  );
}
