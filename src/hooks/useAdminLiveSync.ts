'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const REFRESH_EVENT = 'yap-admin-refresh';

export function useAdminLiveSync() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      router.refresh();
      window.dispatchEvent(new Event(REFRESH_EVENT));
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [router]);

  return { isSyncing, sync };
}

export function useAdminBadges() {
  const [badges, setBadges] = useState({
    pendingReports: 0,
    bannedUsers: 0,
    hiddenPosts: 0,
    newUsersToday: 0,
    unreadEmails: 0,
  });

  useEffect(() => {
    let cancelled = false;

    const fetchBadges = async () => {
      try {
        const res = await fetch('/api/admin/metrics?scope=badges', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setBadges(data.badges);
      } catch {
        // ignore
      }
    };

    void fetchBadges();
    window.addEventListener(REFRESH_EVENT, fetchBadges);
    return () => {
      cancelled = true;
      window.removeEventListener(REFRESH_EVENT, fetchBadges);
    };
  }, []);

  return badges;
}
