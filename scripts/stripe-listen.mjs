/**
 * Forward webhooks using STRIPE_SECRET_KEY from .env (matches your platform account).
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { spawn } from 'child_process';

function loadStripeKey() {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const m = raw.match(/^STRIPE_SECRET_KEY=(.+)$/m);
  const key = m?.[1]?.trim().replace(/^["']|["']$/g, '');
  if (!key) {
    console.error('Missing STRIPE_SECRET_KEY in .env');
    process.exit(1);
  }
  return key;
}

const key = loadStripeKey();
const args = [
  'listen',
  '--api-key',
  key,
  '--forward-to',
  'localhost:3000/api/stripe/webhook',
  '--events',
  'checkout.session.completed,checkout.session.expired',
];

const child = spawn('stripe', args, { stdio: 'inherit', env: process.env });
child.on('exit', (code) => process.exit(code ?? 0));
