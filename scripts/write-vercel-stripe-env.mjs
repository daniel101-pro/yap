/**
 * Writes Production Stripe vars for manual Vercel paste (gitignored file).
 * Run after stripe-webhook-production.mjs --recreate
 *
 *   node scripts/write-vercel-stripe-env.mjs whsec_your_production_secret
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const prodWhsec = process.argv[2]?.trim();
if (!prodWhsec?.startsWith('whsec_')) {
  console.error('Usage: node scripts/write-vercel-stripe-env.mjs whsec_...');
  process.exit(1);
}

let sk = process.env.STRIPE_SECRET_KEY?.trim();
if (!sk) {
  const raw = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
  const m = raw.match(/^STRIPE_SECRET_KEY=(.+)$/m);
  sk = m?.[1]?.trim().replace(/^["']|["']$/g, '');
}
if (!sk) {
  console.error('Missing STRIPE_SECRET_KEY in .env');
  process.exit(1);
}

const out = `# Paste into Vercel → Project → Settings → Environment Variables (Production)
# Then redeploy yap.college

STRIPE_SECRET_KEY=${sk}
STRIPE_WEBHOOK_SECRET=${prodWhsec}
`;

const path = resolve(process.cwd(), '.env.vercel-stripe-paste');
writeFileSync(path, out, 'utf8');
console.log('Wrote', path);
console.log('Open Vercel dashboard and add both variables for Production, then redeploy.');
