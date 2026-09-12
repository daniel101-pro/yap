'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

const SYNC_INTERVAL_MS = 30000;
const SYNC_JITTER_MS = 5000;

/** Polls the server while the app is open so feed, counts, and messages stay fresh. */
export function useLiveSync() {
  const isHydrated = useStore((s) => s.isHydrated);
  const syncFromServer = useStore((s) => s.syncFromServer);

  useEffect(() => {
    if (!isHydrated) return;

    const syncIfVisible = () => {
      if (document.visibilityState === 'visible') {
        syncFromServer();
      }
    };

    syncIfVisible();
    const intervalMs = SYNC_INTERVAL_MS + Math.floor(Math.random() * SYNC_JITTER_MS);
    const interval = setInterval(syncIfVisible, intervalMs);
    window.addEventListener('focus', syncIfVisible);
    document.addEventListener('visibilitychange', syncIfVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncIfVisible);
      document.removeEventListener('visibilitychange', syncIfVisible);
    };
  }, [isHydrated, syncFromServer]);
}
