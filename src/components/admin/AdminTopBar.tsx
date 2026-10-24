'use client';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useAdminLiveSync } from '@/hooks/useAdminLiveSync';

export default function AdminTopBar({ adminEmail }: { adminEmail?: string | null }) {
  const { isSyncing, sync } = useAdminLiveSync();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-divider bg-background/80 px-6 backdrop-blur-md lg:px-8">
      <p className="text-[13px] font-semibold text-foreground">Admin</p>

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
