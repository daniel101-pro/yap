import { NextRequest, NextResponse } from 'next/server';
import { getStripeServerClient } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const stripe = getStripeServerClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid signature';
    return NextResponse.json({ error: message }, { status: 400 });
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
