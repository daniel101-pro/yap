import { NextRequest, NextResponse } from 'next/server';
import {
  getStripeServerClient,
  isStripeConfigured,
  isStripeWebhookConfigured,
} from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

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

    if (ticketId) {
      const ticket = await prisma.nightlifeTicket.update({
        where: { id: ticketId },
        data: { status: 'sold' },
        include: { seller: true },
      });

      if (buyerId && ticket.sellerId !== buyerId) {
        await prisma.notification.create({
          data: {
            userId: ticket.sellerId,
            type: 'listing_sold',
            title: 'Ticket sold!',
            body: `Your "${ticket.title}" ticket was purchased.`,
            listingId: ticketId,
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
