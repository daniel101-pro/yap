import { prisma } from '@/lib/prisma';
import { getStripeServerClient, isStripeConfigured } from '@/lib/stripe';
import { isPayoutAvailable } from '@/lib/nightlife-payouts';

/** Transfer held funds to Connect accounts after the 24h buyer-protection window. */
export async function releaseDueTicketPayouts(options?: { sellerId?: string }) {
  if (!isStripeConfigured()) return { released: 0, errors: 0 };

  const now = new Date();
  const due = await prisma.nightlifeTicket.findMany({
    where: {
      status: 'sold',
      soldAt: { not: null },
      payoutReleasedAt: null,
      stripePaymentIntentId: { not: null },
      saleAmountPence: { not: null },
      ...(options?.sellerId ? { sellerId: options.sellerId } : {}),
    },
    include: { seller: { select: { stripeAccountId: true } } },
    take: 50,
  });

  const stripe = getStripeServerClient();
  let released = 0;
  let errors = 0;

  for (const ticket of due) {
    if (!ticket.soldAt || !isPayoutAvailable(ticket.soldAt, now.getTime())) continue;
    const destination = ticket.seller.stripeAccountId;
    if (!destination || !ticket.stripePaymentIntentId || ticket.saleAmountPence == null) continue;

    try {
      const pi = await stripe.paymentIntents.retrieve(ticket.stripePaymentIntentId);
      const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
      if (!chargeId) {
        errors += 1;
        continue;
      }

      await stripe.transfers.create({
        amount: ticket.saleAmountPence,
        currency: 'gbp',
        destination,
        source_transaction: chargeId,
        metadata: { ticketId: ticket.id, yap: 'nightlife_payout' },
      });

      await prisma.nightlifeTicket.update({
        where: { id: ticket.id },
        data: { payoutReleasedAt: new Date() },
      });
      released += 1;
    } catch {
      errors += 1;
    }
  }

  return { released, errors };
}
