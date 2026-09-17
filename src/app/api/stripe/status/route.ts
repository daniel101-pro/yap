import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient, isStripeConfigured, isStripeWebhookConfigured } from '@/lib/stripe';
import { rememberStripeSellerPurchaseReady } from '@/lib/stripe-seller-ready';

export async function GET() {
  const configured = isStripeConfigured();
  const webhooks = isStripeWebhookConfigured();

  let connectAccount = false;
  /** User finished Stripe's onboarding form (return_url hit). */
  let onboardingComplete = false;
  /** Connected account can accept ticket payments. */
  let canReceivePayments = false;

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
          onboardingComplete = Boolean(account.details_submitted);
          canReceivePayments = Boolean(account.charges_enabled);
          rememberStripeSellerPurchaseReady(
            dbUser.stripeAccountId,
            canReceivePayments,
            onboardingComplete,
          );
        } catch {
          onboardingComplete = false;
          canReceivePayments = false;
        }
      }
    }
  }

  return NextResponse.json({
    enabled: configured,
    webhooks,
    connectAccount,
    onboardingComplete,
    canReceivePayments,
    /** @deprecated use onboardingComplete / canReceivePayments */
    payoutsReady: onboardingComplete && canReceivePayments,
  });
}
