import { NextRequest } from 'next/server';

/** Valid bcrypt hash used only to equalize password-check timing. */
export const TIMING_SAFE_DUMMY_HASH =
  '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';

export function publicErrorMessage(_error: unknown, fallback: string): string {
  return fallback;
}

export function getTrustedOrigin(request: NextRequest): string {
  const configured = process.env.AUTH_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request host.
    }
  }
  return request.nextUrl.origin;
}

export function collectAllowedOrigins(request: NextRequest): Set<string> {
  const allowed = new Set<string>([request.nextUrl.origin]);
  const configured = process.env.AUTH_URL?.trim();
  if (configured) {
    try {
      allowed.add(new URL(configured).origin);
    } catch {
      // Ignore malformed AUTH_URL.
    }
  }
  return allowed;
}

export function isAllowedBrowserOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return collectAllowedOrigins(request).has(new URL(origin).origin);
  } catch {
    return false;
  }
}

export function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured');
  }
  return secret;
}
