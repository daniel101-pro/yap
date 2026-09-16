import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient, isStripeConfigured, isStripeWebhookConfigured } from '@/lib/stripe';

export async function GET() {
  const configured = isStripeConfigured();
  const webhooks = isStripeWebhookConfigured();

  let connectAccount = false;
  let payoutsReady = false;

  if (configured) {
    const user = await getSessionUser();
    if (user?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { stripeAccountId: true },
      });
      connectAccount = Boolean(dbUser?.stripeAccountId);
      if (dbUser?.stripeAccountId) {
        try {
          const stripe = getStripeServerClient();
          const account = await stripe.accounts.retrieve(dbUser.stripeAccountId);
          payoutsReady = Boolean(account.charges_enabled && account.payouts_enabled);
        } catch {
          payoutsReady = false;
        }
      }
    }
  }

  return NextResponse.json({
    enabled: configured,
    webhooks,
    connectAccount,
    payoutsReady,
  });
}
