/**
 * Switch YAP to a new Stripe platform account.
 *
 * 1. New Stripe Dashboard → Connect → enable Express (same as before).
 * 2. Copy Secret key → .env STRIPE_SECRET_KEY and Vercel (Production + Preview if used).
 * 3. stripe login   (CLI → pick the NEW account)
 * 4. npm run stripe:listen → copy whsec → .env STRIPE_WEBHOOK_SECRET, restart dev
 * 5. node scripts/stripe-webhook-production.mjs → whsec → Vercel STRIPE_WEBHOOK_SECRET
 * 6. node scripts/stripe-switch-account.mjs --clear-connect
 * 7. Redeploy Vercel. Sellers re-run “Set up payouts” once.
 *
 * Usage:
 *   node scripts/stripe-switch-account.mjs              # checklist only
 *   node scripts/stripe-switch-account.mjs --clear-connect
 */
import { PrismaClient } from '@prisma/client';

const clear = process.argv.includes('--clear-connect');

console.log(`
Stripe account switch checklist
─────────────────────────────
• STRIPE_SECRET_KEY     → .env + Vercel (sk_test_… or sk_live_… on new account)
• STRIPE_WEBHOOK_SECRET → local whsec from stripe:listen; prod whsec from stripe-webhook-production.mjs
• stripe login          → CLI must use the same Stripe account as your secret key
• Connect Express       → enabled on the NEW account
• Sellers               → old stripeAccountId values are invalid after a switch; clear DB (below)
`);

if (!clear) {
  console.log('Run with --clear-connect to NULL all User.stripeAccountId in the database.\n');
  process.exit(0);
}

const prisma = new PrismaClient();
try {
  const { count } = await prisma.user.updateMany({
    where: { stripeAccountId: { not: null } },
    data: { stripeAccountId: null },
  });
  console.log(`Cleared stripeAccountId on ${count} user(s). They can connect payouts again on the new account.\n`);
} finally {
  await prisma.$disconnect();
}
