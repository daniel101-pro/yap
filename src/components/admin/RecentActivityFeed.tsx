'use client';

import { motion } from 'framer-motion';
import { UserPlus, MessageSquare, ShoppingBag, Flag } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import type { ActivityEvent } from '@/lib/admin-analytics';

const ICONS: Record<ActivityEvent['type'], React.ElementType> = {
  user: UserPlus,
  post: MessageSquare,
  listing: ShoppingBag,
  report: Flag,
};

const COLORS: Record<ActivityEvent['type'], string> = {
  user: 'text-exeter bg-exeter/10',
  post: 'text-blue-500 bg-blue-500/10',
  listing: 'text-amber-500 bg-amber-500/10',
  report: 'text-red-500 bg-red-500/10',
};

export default function RecentActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted">Nothing happening yet</p>;
  }

  return (
    <div className="space-y-1">
      {events.map((e, i) => {
        const Icon = ICONS[e.type];
        return (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface"
          >
            <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${COLORS[e.type]}`}>
              <Icon className="h-3.5 w-3.5" strokeWidth={2} />
            </div>
            <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">{e.label}</p>
            <span className="flex-shrink-0 text-[11px] text-muted-light">{timeAgo(e.timestamp)}</span>
          </motion.div>
        );
      })}
    </div>
  );
}
