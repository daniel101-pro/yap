/**
 * Creates (or finds) the production webhook for yap.college.
 * Run once: node scripts/stripe-webhook-production.mjs
 * Copy the printed whsec_… into Vercel → STRIPE_WEBHOOK_SECRET (Production).
 */
import Stripe from 'stripe';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^STRIPE_SECRET_KEY=(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {
    // ignore
  }
  return process.env.STRIPE_SECRET_KEY?.trim();
}

const key = loadEnv();
if (!key) {
  console.error('Missing STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const WEBHOOK_URL = process.env.STRIPE_WEBHOOK_URL ?? 'https://yap.college/api/stripe/webhook';
const EVENTS = ['checkout.session.completed', 'checkout.session.expired'];
const recreate = process.argv.includes('--recreate');

const stripe = new Stripe(key);

const existing = await stripe.webhookEndpoints.list({ limit: 100 });
let endpoint = existing.data.find((e) => e.url === WEBHOOK_URL);

if (endpoint && recreate) {
  await stripe.webhookEndpoints.del(endpoint.id);
  endpoint = undefined;
  console.log('Removed existing webhook for recreate.');
}

if (!endpoint) {
  endpoint = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: EVENTS,
    description: 'YAP Nightlife ticket checkout',
  });
  console.log('\nCreated webhook:', WEBHOOK_URL);
  console.log('\nAdd to Vercel (Production) STRIPE_WEBHOOK_SECRET=');
  console.log(endpoint.secret);
  console.log('\n(Local dev still needs: npm run stripe:listen → different whsec in .env)\n');
} else {
  console.log('\nWebhook already exists:', WEBHOOK_URL);
  console.log('Run with --recreate to delete and create a new signing secret.\n');
}
