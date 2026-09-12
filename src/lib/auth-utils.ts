const EXETER_LOCAL = /^[a-z0-9](?:[a-z0-9._%+-]{0,62}[a-z0-9])?$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Accept only a local-part @exeter.ac.uk — not a suffix match on an arbitrary address. */
export function isExeterEmail(email: string) {
  const normalized = normalizeEmail(email);
  if (normalized.length < 15 || normalized.length > 128) return false;
  if (normalized.includes('..')) return false;

  const at = normalized.lastIndexOf('@');
  if (at <= 0) return false;
  if (normalized.slice(at + 1) !== 'exeter.ac.uk') return false;

  const local = normalized.slice(0, at);
  return EXETER_LOCAL.test(local);
}
