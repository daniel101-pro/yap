import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await request.json();
    if (!ticketId || typeof ticketId !== 'string') {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    const ticket = await prisma.nightlifeTicket.findUnique({
      where: { id: ticketId },
      include: { seller: true },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.status === 'sold' || ticket.status === 'reserved') {
      return NextResponse.json({ error: 'Ticket no longer available' }, { status: 400 });
    }

    if (ticket.sellerId === session.user.id) {
      return NextResponse.json({ error: 'Cannot buy your own ticket' }, { status: 400 });
    }

    const stripe = getStripeServerClient();
    const origin = request.headers.get('origin') ?? 'http://localhost:3000';
    const amount = Math.max(1, Math.round(ticket.price * 100));

    await prisma.nightlifeTicket.update({
      where: { id: ticketId },
      data: { status: 'reserved' },
    });

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${origin}/?tab=nightlife&checkout=success`,
      cancel_url: `${origin}/?tab=nightlife&checkout=cancel`,
      metadata: {
        ticketId: ticket.id,
        buyerId: session.user.id,
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amount,
            product_data: {
              name: `${ticket.title} - ${ticket.venue}`,
              description: 'Resale ticket purchase via YAP Nightlife',
            },
          },
        },
      ],
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Stripe checkout failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
