'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_MS = 12_000;

export function useAdminLiveSync() {
  const router = useRouter();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (syncingRef.current || document.visibilityState !== 'visible') return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      router.refresh();
      setLastSync(new Date());
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [router]);

  useEffect(() => {
    sync();
    const interval = setInterval(sync, REFRESH_MS);
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [sync]);

  return { lastSync, isSyncing, sync };
}

export function useAdminBadges() {
  const [badges, setBadges] = useState({
    pendingReports: 0,
    bannedUsers: 0,
    hiddenPosts: 0,
    newUsersToday: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchBadges = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/admin/metrics?scope=badges', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setBadges(data.badges);
      } catch {
        // ignore polling errors
      }
    };

    fetchBadges();
    const interval = setInterval(fetchBadges, REFRESH_MS);
    document.addEventListener('visibilitychange', fetchBadges);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', fetchBadges);
    };
  }, []);

  return badges;
}
