import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import {
  getStripeServerClient,
  isStripeConfigured,
  stripeUnavailableMessage,
  STRIPE_NOT_CONFIGURED,
} from '@/lib/stripe';
import { checkRateLimit } from '@/lib/rate-limit';
import { getTrustedOrigin, publicErrorMessage } from '@/lib/security';
import { resolveSellerIdFromRepCode } from '@/lib/rep-code';

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: stripeUnavailableMessage() }, { status: 503 });
    }

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
    const repCodeRaw = typeof body.repCode === 'string' ? body.repCode.trim() : '';
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

    if (!ticket.ticketProofUrl && !ticket.ticketProofData) {
      return NextResponse.json(
        { error: 'This listing has no ticket file yet. Ask the seller to re-list with their ticket uploaded.' },
        { status: 400 },
      );
    }

    const sellerAccountId = ticket.seller.stripeAccountId;
    if (!sellerAccountId) {
      return NextResponse.json(
        { error: 'This ticket is not available to buy right now. Try another slot.' },
        { status: 400 },
      );
    }

    const stripe = getStripeServerClient();
    const sellerAccount = await stripe.accounts.retrieve(sellerAccountId);
    if (!sellerAccount.charges_enabled) {
      return NextResponse.json(
        { error: 'This ticket is not available to buy right now. Try another slot.' },
        { status: 400 },
      );
    }

    const origin = getTrustedOrigin(request);
    const amount = Math.max(50, Math.round(ticket.price * 100));

    let repSellerId: string | undefined;
    if (repCodeRaw) {
      const resolved = await resolveSellerIdFromRepCode(repCodeRaw);
      if (resolved === ticket.sellerId) repSellerId = resolved;
    }

    await prisma.nightlifeTicket.update({
      where: { id: ticketId },
      data: { status: 'reserved' },
    });

    try {
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${origin}/?tab=nightlife&checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?tab=nightlife&checkout=cancel&ticketId=${ticket.id}`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        customer_email: user.email ?? undefined,
        metadata: {
          ticketId: ticket.id,
          buyerId: user.id,
          ...(repSellerId ? { repSellerId } : {}),
        },
        payment_intent_data: {
          metadata: {
            ticketId: ticket.id,
            sellerId: ticket.sellerId,
            sellerAccountId,
          },
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
    } catch (checkoutError) {
      await prisma.nightlifeTicket.updateMany({
        where: { id: ticketId, status: 'reserved' },
        data: { status: 'active' },
      });
      throw checkoutError;
    }
  } catch (error) {
    if (error instanceof Error && error.message === STRIPE_NOT_CONFIGURED) {
      return NextResponse.json({ error: stripeUnavailableMessage() }, { status: 503 });
    }
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Checkout is unavailable right now') },
      { status: 500 },
    );
  }
}
