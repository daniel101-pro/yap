const DASHBOARD_CACHE_KEY = 'yap-seller-dashboard-v1';

export function readSellerDashboardCache<T>(): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeSellerDashboardCache(data: unknown) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

export function clearSellerDashboardCache() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(DASHBOARD_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
