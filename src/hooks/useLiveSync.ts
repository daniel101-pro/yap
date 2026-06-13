'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/store';

const SYNC_INTERVAL_MS = 15000;

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
    const interval = setInterval(syncIfVisible, SYNC_INTERVAL_MS);
    window.addEventListener('focus', syncIfVisible);
    document.addEventListener('visibilitychange', syncIfVisible);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncIfVisible);
      document.removeEventListener('visibilitychange', syncIfVisible);
    };
  }, [isHydrated, syncFromServer]);
}
