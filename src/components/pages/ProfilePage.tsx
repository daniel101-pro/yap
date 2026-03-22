'use client';

import { motion } from 'framer-motion';
import { TrendingUp, MessageSquare, ChevronRight, User, LogOut } from 'lucide-react';
import { mockProfile } from '@/lib/mock-data';
import { useStore } from '@/lib/store';

export default function ProfilePage() {
  const { posts } = useStore();
  const userPosts = posts.slice(0, 3);

  return (
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
          className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-5"
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
          Verified · {mockProfile.university}
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-[11px] text-muted-light mt-1"
        >
          Joined {mockProfile.joinDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </motion.p>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0, 0, 0.2, 1] as const }}
        className="grid grid-cols-2 gap-3 mb-8"
      >
        {[
          { icon: TrendingUp, value: mockProfile.karma.toLocaleString(), label: 'Karma' },
          { icon: MessageSquare, value: mockProfile.postCount, label: 'Yaps' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/[0.04] border border-white/[0.04] rounded-2xl p-5 text-center">
            <stat.icon className="w-5 h-5 text-exeter mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
            <p className="text-[28px] font-black text-foreground tracking-tight leading-none">
              {stat.value}
            </p>
            <p className="text-[11px] text-muted font-medium mt-2">{stat.label}</p>
          </div>
        ))}
      </motion.div>

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
        <div className="divide-y divide-white/[0.04]">
          {userPosts.map((post) => (
            <button
              key={post.id}
              className="w-full text-left py-4 flex items-center justify-between group min-h-[48px]"
              aria-label={`View post: ${post.content?.slice(0, 40) || post.poll?.question}`}
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="text-[14px] text-foreground/90 line-clamp-1 leading-snug">
                  {post.content || post.poll?.question}
                </p>
                <p className="text-[11px] text-muted-light mt-1.5">
                  {Object.values(post.reactions).reduce((a, b) => a + b, 0)} reactions · {post.commentCount} comments
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-light group-hover:text-muted transition-colors duration-200 flex-shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h3 className="text-[11px] font-semibold text-muted uppercase tracking-[0.08em] mb-4">
          Settings
        </h3>
        <button className="w-full flex items-center justify-between py-4 text-left border-t border-white/[0.04] min-h-[48px]">
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-muted-light" strokeWidth={1.5} />
            <span className="text-[14px] text-foreground/90">Sign Out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-light" aria-hidden="true" />
        </button>
      </motion.div>
    </motion.div>
  );
}
