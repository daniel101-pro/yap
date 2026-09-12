'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useAdminLiveSync } from '@/hooks/useAdminLiveSync';

function formatSyncAge(date: Date | null) {
  if (!date) return 'Connecting…';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return 'Just now';
  if (secs < 60) return `${secs}s ago`;
  return `${Math.floor(secs / 60)}m ago`;
}

export default function AdminTopBar({ adminEmail }: { adminEmail?: string | null }) {
  const { lastSync, isSyncing, sync } = useAdminLiveSync();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-divider bg-background/80 px-6 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[12px] font-semibold text-foreground">Live</span>
        </div>
        <span className="hidden text-[12px] text-muted sm:inline">
          Updated {formatSyncAge(lastSync)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => sync()}
          disabled={isSyncing}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground disabled:opacity-50"
          aria-label="Refresh now"
        >
          <motion.div animate={isSyncing ? { rotate: 360 } : { rotate: 0 }} transition={{ duration: 0.6 }}>
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
          </motion.div>
        </button>
        {adminEmail && (
          <span className="hidden max-w-[180px] truncate text-[12px] text-muted md:inline">
            {adminEmail}
          </span>
        )}
      </div>
    </header>
  );
}
