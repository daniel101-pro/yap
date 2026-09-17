import { prisma } from '@/lib/prisma';
import { sendNightlifeTicketEmail } from '@/lib/email';
import { fetchTicketProofAttachment } from '@/lib/ticket-proof-fetch';
import { recordRepCodeUse } from '@/lib/rep-code';

export type FulfillTicketResult = {
  ok: boolean;
  alreadyFulfilled: boolean;
  emailSent: boolean;
  ticketId: string;
  buyerEmail: string | null;
};

export async function fulfillNightlifeTicketPurchase(input: {
  ticketId: string;
  buyerId: string;
  stripePaymentIntentId: string | null;
  saleAmountPence: number | null;
  buyerEmailHint?: string | null;
  repSellerId?: string | null;
}): Promise<FulfillTicketResult> {
  const existing = await prisma.nightlifeTicket.findUnique({
    where: { id: input.ticketId },
    include: { seller: true },
  });

  if (!existing) {
    return {
      ok: false,
      alreadyFulfilled: false,
      emailSent: false,
      ticketId: input.ticketId,
      buyerEmail: null,
    };
  }

  const soldAt = existing.soldAt ?? new Date();
  const alreadyFulfilled = existing.status === 'sold';

  const ticket = alreadyFulfilled
    ? existing
    : await prisma.nightlifeTicket.update({
        where: { id: input.ticketId },
        data: {
          status: 'sold',
          soldAt,
          buyerId: input.buyerId,
          stripePaymentIntentId: input.stripePaymentIntentId ?? existing.stripePaymentIntentId,
          saleAmountPence: input.saleAmountPence ?? existing.saleAmountPence,
        },
        include: { seller: true },
      });

  if (!alreadyFulfilled && input.repSellerId && input.repSellerId === ticket.sellerId) {
    try {
      await recordRepCodeUse(ticket.sellerId, ticket.id);
    } catch (err) {
      console.error('[fulfill-ticket] rep code', err);
    }
  }

  if (!alreadyFulfilled && ticket.sellerId !== input.buyerId) {
    await prisma.notification.create({
      data: {
        userId: ticket.sellerId,
        type: 'listing_sold',
        title: 'Ticket sold!',
        body: `Your "${ticket.title}" ticket was purchased.`,
        listingId: ticket.id,
      },
    });
  }

  const buyerRow = await prisma.user.findUnique({
    where: { id: input.buyerId },
    select: { email: true },
  });
  const buyerEmail =
    buyerRow?.email?.trim() ||
    input.buyerEmailHint?.trim() ||
    null;

  let emailSent = false;

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
        emailSent = true;
      }
    } catch (err) {
      console.error('[fulfill-ticket] email failed', err);
    }
  }

  if (!alreadyFulfilled) {
    const notifyBody = emailSent
      ? `We sent "${ticket.title}" to ${buyerEmail}. Check your inbox (and spam).`
      : `Your ticket for "${ticket.title}" is ready in Nightlife → My tickets.`;

    await prisma.notification.create({
      data: {
        userId: input.buyerId,
        type: 'system',
        title: emailSent ? 'Ticket emailed' : 'Ticket ready',
        body: notifyBody,
        listingId: ticket.id,
      },
    });
  }

  return {
    ok: true,
    alreadyFulfilled,
    emailSent,
    ticketId: ticket.id,
    buyerEmail,
  };
}
