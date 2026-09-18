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
    const botInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      fetch('/api/feed/reaction-tick', { method: 'POST', credentials: 'same-origin' }).catch(
        () => undefined,
      );
    }, 40000);
    window.addEventListener('focus', syncIfVisible);
    document.addEventListener('visibilitychange', syncIfVisible);

    void fetch('/api/feed/reaction-tick', { method: 'POST', credentials: 'same-origin' }).catch(
      () => undefined,
    );

    return () => {
      clearInterval(interval);
      clearInterval(botInterval);
      window.removeEventListener('focus', syncIfVisible);
      document.removeEventListener('visibilitychange', syncIfVisible);
    };
  }, [isHydrated, syncFromServer]);
}
