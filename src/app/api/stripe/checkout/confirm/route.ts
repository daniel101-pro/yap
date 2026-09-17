import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { getStripeServerClient, isStripeConfigured, stripeUnavailableMessage } from '@/lib/stripe';
import { fulfillNightlifeTicketPurchase } from '@/lib/fulfill-nightlife-ticket';
import { checkRateLimit } from '@/lib/rate-limit';

/** Backup when webhooks are delayed (common in local dev). Idempotent. */
export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: stripeUnavailableMessage() }, { status: 503 });
  }

  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`checkout-confirm:${user.id}`, 12, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
  if (!sessionId) {
    return NextResponse.json({ error: 'Missing checkout session' }, { status: 400 });
  }

  const stripe = getStripeServerClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Payment not completed yet.' }, { status: 400 });
  }

  const ticketId = session.metadata?.ticketId ?? '';
  const buyerId = session.metadata?.buyerId ?? '';
  if (!ticketId || buyerId !== user.id) {
    return NextResponse.json({ error: 'Invalid checkout session.' }, { status: 400 });
  }

  const piRaw = session.payment_intent;
  const stripePaymentIntentId =
    typeof piRaw === 'string' ? piRaw : piRaw && typeof piRaw === 'object' && 'id' in piRaw
      ? String((piRaw as { id: string }).id)
      : null;
  const saleAmountPence = typeof session.amount_total === 'number' ? session.amount_total : null;

  const result = await fulfillNightlifeTicketPurchase({
    ticketId,
    buyerId: user.id,
    stripePaymentIntentId,
    saleAmountPence,
    buyerEmailHint: session.customer_details?.email ?? user.email ?? null,
    repSellerId: session.metadata?.repSellerId ?? null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    emailSent: result.emailSent,
    buyerEmail: result.buyerEmail,
    ticketId: result.ticketId,
  });
}
