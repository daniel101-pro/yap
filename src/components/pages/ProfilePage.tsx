'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, MessageSquare, ChevronRight, User, Settings, Heart, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import CommentSheet from '@/components/feed/CommentSheet';

export default function ProfilePage() {
  const { posts, setShowSettings, savedListings, listings, setActiveTab, setSelectedListing, deletePost, email } = useStore();
  const [openCommentPostId, setOpenCommentPostId] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Calculate dynamic stats
  const totalReactions = posts.reduce((sum, post) => {
    return sum + Object.values(post.reactions).reduce((a, b) => a + b, 0);
  }, 0);
  const postCount = posts.length;

  const userPosts = posts.slice(0, 5);
  const saved = listings.filter((l) => savedListings.includes(l.id));

  const handleDeletePost = (postId: string) => {
    deletePost(postId);
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
        className="px-5 pb-6"
      >
        {/* Profile Header */}
        <div className="flex flex-col items-center pt-8 pb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] as const }}
            className="w-20 h-20 rounded-full bg-surface border border-divider flex items-center justify-center mb-5"
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
            className="text-[11px] text-muted-light mt-1"
          >
            {email || 'user@exeter.ac.uk'}
          </motion.p>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0, 0, 0.2, 1] as const }}
          className="grid grid-cols-3 gap-3 mb-8"
        >
          {[
            { icon: TrendingUp, value: totalReactions.toLocaleString(), label: 'Reactions' },
            { icon: MessageSquare, value: postCount, label: 'Yaps' },
            { icon: Heart, value: savedListings.length, label: 'Saved' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface border border-divider rounded-2xl p-4 text-center">
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
            className="mb-8"
          >
            <button
              onClick={() => setShowSaved(!showSaved)}
              className="flex items-center justify-between w-full mb-3"
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
                  <div className="divide-y divide-divider">
                    {saved.map((listing) => (
                      <button
                        key={listing.id}
                        onClick={() => handleViewSavedListing(listing.id)}
                        className="w-full text-left py-3 flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0 mr-4">
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
          className="mb-8"
        >
          <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em] mb-4">
            Recent Yaps
          </h3>
          <div className="divide-y divide-divider">
            {userPosts.map((post) => (
              <div key={post.id} className="relative">
                <button
                  onClick={() => setOpenCommentPostId(post.id)}
                  className="w-full text-left py-4 flex items-center justify-between group min-h-[48px]"
                  aria-label={`View post: ${post.content?.slice(0, 40) || post.poll?.question}`}
                >
                  <div className="flex-1 min-w-0 mr-4">
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
                    className="absolute right-8 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-red-500/10 transition-colors"
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
            className="w-full flex items-center justify-between py-4 text-left border-t border-divider min-h-[48px]"
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-background border border-divider rounded-2xl p-6 w-[280px] text-center shadow-lg"
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
