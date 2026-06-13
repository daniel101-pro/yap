import { loadEnvConfig } from '@next/env';

let loaded = false;

export function ensureEnvLoaded() {
  if (loaded) return;
  loadEnvConfig(process.cwd());
  loaded = true;
}

export function getResendApiKey() {
  ensureEnvLoaded();

  const key =
    process.env.AUTH_RESEND_KEY ??
    process.env.RESEND_API_KEY ??
    process.env.RESEND_KEY;

  const trimmed = key?.trim();
  if (!trimmed || trimmed === 're_xxx') {
    return null;
  }

  return trimmed;
}

export function isSmtpConfigured() {
  ensureEnvLoaded();
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(host && user && pass);
}
