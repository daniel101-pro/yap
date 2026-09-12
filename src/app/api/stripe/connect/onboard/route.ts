import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { publicErrorMessage } from '@/lib/security';

export async function POST() {
  try {
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
    const origin = process.env.AUTH_URL?.trim()
      ? new URL(process.env.AUTH_URL).origin
      : 'http://localhost:3000';

    let accountId = dbUser?.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
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
  } catch {
    return NextResponse.json(
      { error: publicErrorMessage(null, 'Onboarding is unavailable right now') },
      { status: 500 },
    );
  }
}
