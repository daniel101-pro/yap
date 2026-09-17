const CACHE_PREFIX = 'yap-seller-dashboard-v1';
const LEGACY_KEY = 'yap-seller-dashboard-v1';

function cacheKey(userId: string) {
  return `${CACHE_PREFIX}:${userId}`;
}

export function readSellerDashboardCache<T>(userId: string): T | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSellerDashboardCache(userId: string, data: unknown) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

/** Removes dashboard cache for all users (call on sign-out). */
export function clearSellerDashboardCache() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(LEGACY_KEY);
    const keys = Object.keys(sessionStorage);
    for (const key of keys) {
      if (key.startsWith(`${CACHE_PREFIX}:`)) sessionStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}
