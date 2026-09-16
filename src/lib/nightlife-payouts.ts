/** Buyer protection: sellers receive payout after this hold. */
export const PAYOUT_HOLD_MS = 24 * 60 * 60 * 1000;

export function payoutAvailableAt(soldAt: Date): Date {
  return new Date(soldAt.getTime() + PAYOUT_HOLD_MS);
}

export function isPayoutAvailable(soldAt: Date, now = Date.now()): boolean {
  return payoutAvailableAt(soldAt).getTime() <= now;
}

export function msUntilPayout(soldAt: Date, now = Date.now()): number {
  return Math.max(0, payoutAvailableAt(soldAt).getTime() - now);
}

export function formatPayoutCountdown(ms: number): string {
  if (ms <= 0) return 'Ready';
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const mins = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function poundsFromPence(pence: number): number {
  return Math.round(pence) / 100;
}
