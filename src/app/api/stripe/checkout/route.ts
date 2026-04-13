import { NextRequest, NextResponse } from 'next/server';
import { getStripeServerClient } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const { ticket } = await request.json();
    const stripe = getStripeServerClient();
    const origin = request.headers.get('origin') ?? 'http://localhost:3000';
    const amount = Math.max(1, Math.round(Number(ticket?.price ?? 0) * 100));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/?tab=nightlife&checkout=success`,
      cancel_url: `${origin}/?tab=nightlife&checkout=cancel`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amount,
            product_data: {
              name: `${ticket?.title ?? 'Nightlife ticket'} - ${ticket?.venue ?? 'Exeter'}`,
              description: `Resale ticket purchase via YAP Nightlife`,
            },
          },
        },
      ],
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
