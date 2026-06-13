'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { TrendingUp, MessageSquare, ChevronRight, User, Settings, Heart, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import CommentSheet from '@/components/feed/CommentSheet';

export default function ProfilePage() {
  const { data: session } = useSession();
  const { posts, setShowSettings, savedListings, listings, setActiveTab, setSelectedListing, deletePost } = useStore();
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const userPosts = posts.filter((p) => p.isOwn).slice(0, 5);
  const saved = listings.filter((l) => savedListings.includes(l.id));

  const totalReactions = userPosts.reduce((sum, post) => {
    return sum + Object.values(post.reactions).reduce((a, b) => a + b, 0);
  }, 0);
  const postCount = userPosts.length;

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    setConfirmDelete(null);
  };

  const handleViewSavedListing = (listingId: string) => {
    const listing = listings.find((l) => l.id === listingId);
    if (listing) {
      setSelectedListing(listing);
      setActiveTab('market');
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="px-5 pb-8"
      >
        {/* Profile Header */}
        <div className="mb-7 rounded-3xl bg-surface/60 px-5 pb-8 pt-8">
          <div className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] as const }}
            className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-background shadow-[0_10px_24px_rgba(0,0,0,0.08)]"
          >
            <User className="w-8 h-8 text-muted" strokeWidth={1.2} aria-hidden="true" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-[22px] font-black tracking-[-0.02em] text-foreground mb-1"
          >
            Anonymous Yapper
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[13px] text-muted"
          >
            Verified · University of Exeter
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-1 text-[11px] text-muted-light"
          >
            {session?.user?.email ?? 'user@exeter.ac.uk'}
          </motion.p>
          </div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0, 0, 0.2, 1] as const }}
          className="mb-8 grid grid-cols-3 gap-3"
        >
          {[
            { icon: TrendingUp, value: totalReactions.toLocaleString(), label: 'Reactions' },
            { icon: MessageSquare, value: postCount, label: 'Yaps' },
            { icon: Heart, value: savedListings.length, label: 'Saved' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-surface/70 p-4 text-center">
              <stat.icon className="w-4 h-4 text-exeter mx-auto mb-2" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-[22px] font-black text-foreground tracking-tight leading-none">
                {stat.value}
              </p>
              <p className="text-[10px] text-muted font-medium mt-1.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Saved Listings */}
        {savedListings.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mb-8 rounded-2xl bg-surface/45 p-4"
          >
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="mb-3 flex w-full items-center justify-between"
            >
              <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em]">
                Saved Listings ({savedListings.length})
              </h3>
              <ChevronRight className={`w-4 h-4 text-muted-light transition-transform duration-200 ${showSaved ? 'rotate-90' : ''}`} />
            </button>

            <AnimatePresence>
              {showSaved && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2">
                    {saved.map((listing) => (
                      <button
                        key={listing.id}
                        onClick={() => handleViewSavedListing(listing.id)}
                        className="group flex w-full items-center justify-between rounded-xl bg-background/80 px-3 py-3 text-left transition-colors hover:bg-background"
                      >
                        <div className="mr-4 min-w-0 flex-1">
                          <p className="text-[14px] text-foreground/90 line-clamp-1 leading-snug">
                            {listing.title}
                          </p>
                          <p className="text-[12px] text-exeter font-semibold mt-0.5">
                            £{listing.price}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-light group-hover:text-muted transition-colors" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Recent Yaps */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="mb-8 rounded-2xl bg-surface/45 p-4"
        >
          <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em] mb-4">
            Recent Yaps
          </h3>
          <div className="space-y-2">
            {userPosts.map((post) => (
              <div key={post.id} className="relative rounded-xl bg-background/80 px-3 transition-colors hover:bg-background">
                <button
                  onClick={() => setOpenCommentPostId(post.id)}
                  className="group flex min-h-[48px] w-full items-center justify-between py-4 text-left"
                  aria-label={`View post: ${post.content?.slice(0, 40) || post.poll?.question}`}
                >
                  <div className="mr-4 min-w-0 flex-1">
                    <p className="text-[14px] text-foreground/90 line-clamp-1 leading-snug">
                      {post.content || post.poll?.question}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-[11px] text-muted-light">
                        {Object.values(post.reactions).reduce((a, b) => a + b, 0)} reactions · {post.commentCount} comments
                      </p>
                      <p className="text-[11px] text-muted-light">
                        {timeAgo(post.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-light group-hover:text-muted transition-colors duration-200 flex-shrink-0" aria-hidden="true" />
                  </div>
                </button>

                {/* Delete button */}
                {post.id.startsWith('p') && (
                  <button
                    onClick={() => setConfirmDelete(post.id)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full p-2 transition-colors hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-light hover:text-red-500" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Settings */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <button
            onClick={() => setShowSettings(true)}
            className="flex min-h-[48px] w-full items-center justify-between rounded-2xl bg-surface/55 px-4 py-4 text-left transition-colors hover:bg-surface"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-muted" strokeWidth={1.5} />
              <span className="text-[14px] text-foreground/90">Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-light" aria-hidden="true" />
          </button>
        </motion.div>
      </motion.div>

      {/* Comment Sheet */}
      <AnimatePresence>
        {openCommentPostId && (
          <CommentSheet
            postId={openCommentPostId}
            onClose={() => setOpenCommentPostId(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="fixed inset-0 bg-black/30 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] rounded-2xl p-6 w-[280px] text-center shadow-2xl"
              style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}
            >
              <h3 className="text-[16px] font-bold text-foreground mb-2">Delete Yap?</h3>
              <p className="text-[13px] text-muted mb-5">This can&apos;t be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-2.5 rounded-xl bg-surface text-foreground text-[13px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePost(confirmDelete)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
