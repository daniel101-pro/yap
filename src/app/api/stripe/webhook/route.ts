import { NextRequest, NextResponse } from 'next/server';
import {
  getStripeServerClient,
  isStripeConfigured,
  isStripeWebhookConfigured,
} from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { fulfillNightlifeTicketPurchase } from '@/lib/fulfill-nightlife-ticket';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isStripeConfigured() || !isStripeWebhookConfigured()) {
    return NextResponse.json({ error: 'Stripe webhooks not configured' }, { status: 503 });
  }

  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const ticketId = session.metadata?.ticketId;
    if (ticketId) {
      await prisma.nightlifeTicket.updateMany({
        where: { id: ticketId, status: 'reserved' },
        data: { status: 'active' },
      });
    }
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const ticketId = session.metadata?.ticketId;
    const buyerId = session.metadata?.buyerId;
    const repSellerId = session.metadata?.repSellerId;

    if (ticketId && buyerId) {
      const piRaw = session.payment_intent;
      const stripePaymentIntentId =
        typeof piRaw === 'string' ? piRaw : piRaw && typeof piRaw === 'object' && 'id' in piRaw
          ? String((piRaw as { id: string }).id)
          : null;
      const saleAmountPence =
        typeof session.amount_total === 'number' ? session.amount_total : null;

      try {
        await fulfillNightlifeTicketPurchase({
          ticketId,
          buyerId,
          stripePaymentIntentId,
          saleAmountPence,
          buyerEmailHint: session.customer_details?.email ?? null,
          repSellerId: repSellerId ?? null,
        });
      } catch (err) {
        console.error('[stripe webhook] fulfill ticket', err);
      }
    }
  }

  return NextResponse.json({ received: true });
}
