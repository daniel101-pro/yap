import { NextRequest, NextResponse } from 'next/server';
import {
  getStripeServerClient,
  isStripeConfigured,
  isStripeWebhookConfigured,
} from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendNightlifeTicketEmail } from '@/lib/email';
import { fetchTicketProofAttachment } from '@/lib/ticket-proof-fetch';
import { recordRepCodeUse } from '@/lib/rep-code';

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

    if (ticketId) {
      const piRaw = session.payment_intent;
      const stripePaymentIntentId =
        typeof piRaw === 'string' ? piRaw : piRaw && typeof piRaw === 'object' && 'id' in piRaw
          ? String((piRaw as { id: string }).id)
          : null;
      const saleAmountPence =
        typeof session.amount_total === 'number' ? session.amount_total : null;
      const soldAt = new Date();

      const ticket = await prisma.nightlifeTicket.update({
        where: { id: ticketId },
        data: {
          status: 'sold',
          soldAt,
          stripePaymentIntentId,
          saleAmountPence,
        },
        include: { seller: true },
      });

      if (repSellerId && repSellerId === ticket.sellerId) {
        try {
          await recordRepCodeUse(ticket.sellerId, ticketId);
        } catch (err) {
          console.error('[webhook] rep code use', err);
        }
      }

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

      const buyerEmail =
        session.customer_details?.email ??
        (buyerId
          ? (await prisma.user.findUnique({ where: { id: buyerId }, select: { email: true } }))?.email
          : null);

      if (buyerEmail && (ticket.ticketProofUrl || ticket.ticketProofData)) {
        try {
          const attachment = await fetchTicketProofAttachment(
            ticket.ticketProofUrl ?? '',
            ticket.ticketProofMime ?? 'image/jpeg',
            ticket.title,
            ticket.ticketProofData,
          );
          if (attachment) {
            await sendNightlifeTicketEmail({
              to: buyerEmail,
              title: ticket.title,
              venue: ticket.venue,
              attachment: attachment.buffer,
              filename: attachment.filename,
              contentType: attachment.contentType,
            });
            if (buyerId) {
              await prisma.notification.create({
                data: {
                  userId: buyerId,
                  type: 'system',
                  title: 'Ticket sent to your email',
                  body: `We emailed your ticket for "${ticket.title}" to ${buyerEmail}.`,
                  listingId: ticketId,
                },
              });
            }
          }
        } catch (err) {
          console.error('[stripe webhook] ticket email failed', err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
