import { getStripeServerClient, isStripeConfigured } from '@/lib/stripe';

const CACHE_TTL_MS = 2 * 60 * 1000;

type StripeSellerState = {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  expiresAt: number;
};

const stateCache = new Map<string, StripeSellerState>();

async function loadStripeSellerState(stripeAccountId: string): Promise<StripeSellerState> {
  const id = stripeAccountId.trim();
  const hit = stateCache.get(id);
  if (hit && hit.expiresAt > Date.now()) return hit;

  const empty: StripeSellerState = {
    chargesEnabled: false,
    detailsSubmitted: false,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };

  if (!isStripeConfigured()) {
    stateCache.set(id, empty);
    return empty;
  }

  try {
    const stripe = getStripeServerClient();
    const account = await stripe.accounts.retrieve(id);
    const entry: StripeSellerState = {
      chargesEnabled: Boolean(account.charges_enabled),
      detailsSubmitted: Boolean(account.details_submitted),
      expiresAt: Date.now() + CACHE_TTL_MS,
    };
    stateCache.set(id, entry);
    return entry;
  } catch {
    stateCache.set(id, empty);
    return empty;
  }
}

/** Buyer can pay — charges enabled on Connect account. */
export async function sellerStripePurchaseReady(
  stripeAccountId: string | null | undefined,
): Promise<boolean> {
  if (!stripeAccountId?.trim()) return false;
  const state = await loadStripeSellerState(stripeAccountId);
  return state.chargesEnabled;
}

/** Seller finished Connect onboarding and can list tickets. */
export async function sellerFullySetUpForSelling(
  stripeAccountId: string | null | undefined,
): Promise<boolean> {
  if (!stripeAccountId?.trim()) return false;
  const state = await loadStripeSellerState(stripeAccountId);
  return state.chargesEnabled && state.detailsSubmitted;
}

export async function resolveStripePurchaseReadyByAccount(
  accountIds: Array<string | null | undefined>,
): Promise<Map<string, boolean>> {
  const unique = [...new Set(accountIds.filter((id): id is string => Boolean(id?.trim())))];
  const map = new Map<string, boolean>();
  await Promise.all(
    unique.map(async (id) => {
      map.set(id, await sellerStripePurchaseReady(id));
    }),
  );
  return map;
}

export function invalidateStripeSellerReadyCache(stripeAccountId: string | null | undefined): void {
  if (stripeAccountId?.trim()) stateCache.delete(stripeAccountId.trim());
}

export function rememberStripeSellerPurchaseReady(
  stripeAccountId: string | null | undefined,
  chargesEnabled: boolean,
  detailsSubmitted?: boolean,
): void {
  if (!stripeAccountId?.trim()) return;
  const id = stripeAccountId.trim();
  const prev = stateCache.get(id);
  stateCache.set(id, {
    chargesEnabled,
    detailsSubmitted: detailsSubmitted ?? prev?.detailsSubmitted ?? false,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}
