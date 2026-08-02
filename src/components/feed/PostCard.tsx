'use client';

import { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, MoreHorizontal, Flag, UserX, Trash2 } from 'lucide-react';
import { Post, Reaction } from '@/types';
import { useStore } from '@/lib/store';
import { timeAgo, getCategoryLabel, formatNumber } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';
import { usePostTrending } from '@/hooks/useFeedRanking';
import ReactionButton from '@/components/ui/ReactionButton';
import PollCard from './PollCard';
import CommentSheet from './CommentSheet';

interface PostCardProps {
  post: Post;
  index: number;
}

const reactions: Reaction[] = ['fire', 'cap', 'dead', 'real', 'sus'];

export default function PostCard({ post: initialPost, index }: PostCardProps) {
  const post = useStore((s) => s.posts.find((p) => p.id === initialPost.id) ?? initialPost);
  const reactToPost = useStore((s) => s.reactToPost);
  const deletePost = useStore((s) => s.deletePost);
  const reportPost = useStore((s) => s.reportPost);
  const blockPostAuthor = useStore((s) => s.blockPostAuthor);
  const isTrending = usePostTrending(initialPost.id);
  const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0);
  const CategoryIcon = getCategoryIcon(post.category);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleReport = async () => {
    setMenuBusy(true);
    try {
      await reportPost(post.id, 'reported from feed');
      setFeedback('Reported. Thanks for flagging this.');
    } catch {
      setFeedback('Could not report right now.');
    } finally {
      setMenuBusy(false);
      setShowMenu(false);
    }
  };

  const handleBlock = async () => {
    setMenuBusy(true);
    try {
      await blockPostAuthor(post.id);
    } catch {
      setFeedback('Could not block right now.');
      setMenuBusy(false);
      setShowMenu(false);
    }
  };

  const handleDelete = async () => {
    setMenuBusy(true);
    try {
      await deletePost(post.id);
    } catch {
      setFeedback('Could not delete right now.');
      setMenuBusy(false);
      setShowMenu(false);
    }
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.offsetWidth);
    setActiveMediaIndex(index);
  }, []);

  const mediaItems = post.media?.length ? post.media : null;

  return (
    <>
      <motion.article
        id={`post-${post.id}`}
        initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{
          duration: 0.6,
          delay: index * 0.04,
          ease: [0, 0, 0.2, 1],
        }}
        aria-label={`${getCategoryLabel(post.category)} post`}
        className="py-5 border-b border-divider last:border-b-0"
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
            {isTrending && (
              <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-500">
                Trending
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <time className="text-[12px] text-muted-light">{timeAgo(post.timestamp)}</time>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu((v) => !v)}
                aria-label="Post options"
                className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-muted-light transition-colors hover:bg-surface hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-[55]"
                      onClick={() => setShowMenu(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-8 z-[56] w-44 overflow-hidden rounded-xl bg-background shadow-2xl ring-1 ring-divider"
                    >
                      {post.isOwn ? (
                        <button
                          type="button"
                          disabled={menuBusy}
                          onClick={handleDelete}
                          className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          Delete
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={menuBusy}
                            onClick={handleReport}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-foreground hover:bg-surface disabled:opacity-50"
                          >
                            <Flag className="h-3.5 w-3.5" strokeWidth={2} />
                            Report
                          </button>
                          <button
                            type="button"
                            disabled={menuBusy}
                            onClick={handleBlock}
                            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <UserX className="h-3.5 w-3.5" strokeWidth={2} />
                            Block user
                          </button>
                        </>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {feedback && (
          <p className="mb-2 text-[11px] font-medium text-exeter">{feedback}</p>
        )}

        {/* Content */}
        {post.content && (
          <p className="text-[15px] leading-[1.65] text-foreground/90 mb-4">
            {post.content}
          </p>
        )}

        {/* Poll */}
        {post.poll && <PollCard poll={post.poll} postId={post.id} />}

        {/* Media */}
        {mediaItems && (
          <div className="mt-3 mb-1 rounded-2xl overflow-hidden bg-surface">
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
                        i === activeMediaIndex ? 'bg-foreground/70' : 'bg-foreground/20'
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
            onClick={() => setShowComments(true)}
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

      {/* Comment Sheet */}
      <AnimatePresence>
        {showComments && (
          <CommentSheet
            postId={post.id}
            onClose={() => setShowComments(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
