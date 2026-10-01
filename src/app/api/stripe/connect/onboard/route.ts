import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import {
  getStripeServerClient,
  isStripeConfigured,
  stripeUnavailableMessage,
  STRIPE_NOT_CONFIGURED,
} from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTrustedOrigin, publicErrorMessage } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: stripeUnavailableMessage() }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = checkRateLimit(`stripe-onboard:${user.id}`, 5, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many onboarding attempts. Please wait.' }, { status: 429 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    const stripe = getStripeServerClient();
    const origin = getTrustedOrigin(request);

    let accountId = dbUser?.stripeAccountId;

    if (accountId) {
      const existing = await stripe.accounts.retrieve(accountId);
      if (existing.details_submitted) {
        const login = await stripe.accounts.createLoginLink(accountId);
        return NextResponse.json({ url: login.url, alreadyComplete: true });
      }
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'GB',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Student nightlife ticket resale via YAP',
          mcc: '7922',
        },
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeAccountId: accountId },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?tab=nightlife&onboarding=retry`,
      return_url: `${origin}/?tab=nightlife&onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url });
  } catch (error) {
    if (error instanceof Error && error.message === STRIPE_NOT_CONFIGURED) {
      return NextResponse.json({ error: stripeUnavailableMessage() }, { status: 503 });
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Onboarding is unavailable right now') },
      { status: 500 },
    );
  }
}
