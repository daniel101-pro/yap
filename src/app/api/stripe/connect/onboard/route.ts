import { NextRequest, NextResponse } from 'next/server';
import { getStripeServerClient } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    const stripe = getStripeServerClient();

    const account = await stripe.accounts.create({
      type: 'express',
      email: typeof email === 'string' ? email : undefined,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    const origin = request.headers.get('origin') ?? 'http://localhost:3000';
    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/?tab=nightlife&onboarding=retry`,
      return_url: `${origin}/?tab=nightlife&onboarding=complete`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: link.url, accountId: account.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe onboarding failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
