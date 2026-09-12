import { createHash } from 'crypto';

/** Campus-area bounding box used by the nightlife map UI. */
export const EXETER_BOUNDS = {
  minLat: 50.68,
  maxLat: 50.77,
  minLng: -3.62,
  maxLng: -3.45,
} as const;

export const HOUSE_PARTY_TTL_MS = 48 * 60 * 60 * 1000;
export const MAX_ACTIVE_HOUSE_PARTIES_PER_USER = 3;
export const MAX_PUBLIC_PINS = 80;

export function isInExeterBounds(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= EXETER_BOUNDS.minLat &&
    lat <= EXETER_BOUNDS.maxLat &&
    lng >= EXETER_BOUNDS.minLng &&
    lng <= EXETER_BOUNDS.maxLng
  );
}

export function housePartyExpiry(from = new Date()): Date {
  return new Date(from.getTime() + HOUSE_PARTY_TTL_MS);
}

export function isPinExpired(
  pin: { type: string; createdAt: Date; expiresAt?: Date | null },
  now = new Date(),
): boolean {
  if (pin.expiresAt) return pin.expiresAt.getTime() <= now.getTime();
  if (pin.type === 'house-party') {
    return now.getTime() - pin.createdAt.getTime() >= HOUSE_PARTY_TTL_MS;
  }
  return false;
}

/**
 * Stable ~90–180m offset so house-party pins don't reveal an exact address,
 * and don't jump on every refresh.
 */
export function fuzzLatLng(lat: number, lng: number, salt: string): { lat: number; lng: number } {
  const hash = createHash('sha256').update(`yap-pin:${salt}`).digest();
  const angle = (hash[0] / 255) * Math.PI * 2;
  const meters = 90 + (hash[1] / 255) * 90;
  const dLat = (meters * Math.cos(angle)) / 111_320;
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const dLng = (meters * Math.sin(angle)) / (111_320 * Math.max(0.2, cosLat));
  return {
    lat: Number((lat + dLat).toFixed(5)),
    lng: Number((lng + dLng).toFixed(5)),
  };
}
