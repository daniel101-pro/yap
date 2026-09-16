import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import {
  getStripeServerClient,
  isStripeConfigured,
  stripeUnavailableMessage,
  STRIPE_NOT_CONFIGURED,
} from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { publicErrorMessage } from '@/lib/security';

/** Redirect sellers to the Stripe Express Dashboard to manage payouts. */
export async function POST() {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: stripeUnavailableMessage() }, { status: 503 });
    }

    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = checkRateLimit(`stripe-dashboard:${user.id}`, 10, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many requests. Please wait.' }, { status: 429 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeAccountId: true },
    });

    if (!dbUser?.stripeAccountId) {
      return NextResponse.json({ error: 'Complete payout setup first.' }, { status: 400 });
    }

    const stripe = getStripeServerClient();
    const link = await stripe.accounts.createLoginLink(dbUser.stripeAccountId);

    return NextResponse.json({ url: link.url });
  } catch (error) {
    if (error instanceof Error && error.message === STRIPE_NOT_CONFIGURED) {
      return NextResponse.json({ error: stripeUnavailableMessage() }, { status: 503 });
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Could not open payout dashboard') },
      { status: 500 },
    );
  }
}
