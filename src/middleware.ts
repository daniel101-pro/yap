import { NextRequest, NextResponse } from 'next/server';
import { collectAllowedOrigins } from '@/lib/security';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isCsrfExempt(pathname: string): boolean {
  if (pathname === '/api/stripe/webhook') return true;
  // Auth.js handlers only — not the custom send-code / check-email routes.
  if (pathname === '/api/auth/send-code' || pathname === '/api/auth/check-email') return false;
  return pathname === '/api/auth' || pathname.startsWith('/api/auth/');
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
      "media-src 'self' blob: https://*.blob.vercel-storage.com https://*.public.blob.vercel-storage.com",
      "connect-src 'self' https://*.tile.openstreetmap.org https://nominatim.openstreetmap.org https://*.stripe.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.stripe.com",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; '),
  );
  return response;
}

export function middleware(request: NextRequest) {
  if (MUTATING.has(request.method) && !isCsrfExempt(request.nextUrl.pathname)) {
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        const allowed = collectAllowedOrigins(request);
        if (!allowed.has(new URL(origin).origin)) {
          return applySecurityHeaders(
            NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
          );
        }
      } catch {
        return applySecurityHeaders(
          NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
        );
      }
    }
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)'],
};
