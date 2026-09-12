import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { getStripeServerClient } from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTrustedOrigin, publicErrorMessage } from '@/lib/security';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limit = checkRateLimit(`checkout:${user.id}`, 8, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ error: 'Too many checkout attempts. Please wait.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const ticketId = typeof body.ticketId === 'string' ? body.ticketId : '';
    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 });
    }

    const ticket = await prisma.nightlifeTicket.findUnique({
      where: { id: ticketId },
      include: { seller: true },
    });

    if (!ticket || ticket.seller.isBanned) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.status === 'sold' || ticket.status === 'reserved') {
      return NextResponse.json({ error: 'Ticket no longer available' }, { status: 400 });
    }

    if (ticket.sellerId === user.id) {
      return NextResponse.json({ error: 'Cannot buy your own ticket' }, { status: 400 });
    }

    const stripe = getStripeServerClient();
    const origin = getTrustedOrigin(request);
    const amount = Math.max(50, Math.round(ticket.price * 100));

    await prisma.nightlifeTicket.update({
      where: { id: ticketId },
      data: { status: 'reserved' },
    });

    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${origin}/?tab=nightlife&checkout=success`,
        cancel_url: `${origin}/?tab=nightlife&checkout=cancel`,
        metadata: {
          ticketId: ticket.id,
          buyerId: user.id,
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'gbp',
              unit_amount: amount,
              product_data: {
                name: `${ticket.title} - ${ticket.venue}`.slice(0, 120),
                description: 'Resale ticket purchase via YAP Nightlife',
              },
            },
          },
        ],
      });

      return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
      await prisma.nightlifeTicket.updateMany({
        where: { id: ticketId, status: 'reserved' },
        data: { status: 'active' },
      });
      throw error;
    }
  } catch {
    return NextResponse.json(
      { error: publicErrorMessage(null, 'Checkout is unavailable right now') },
      { status: 500 },
    );
  }
}
