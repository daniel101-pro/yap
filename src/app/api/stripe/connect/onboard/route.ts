import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient } from '@/lib/stripe';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const stripe = getStripeServerClient();
    const origin = process.env.AUTH_URL ?? 'http://localhost:3000';

    let accountId = user?.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: session.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeAccountId: accountId },
      });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/?tab=nightlife&onboarding=retry`,
      return_url: `${origin}/?tab=nightlife&onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url, accountId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe onboarding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
