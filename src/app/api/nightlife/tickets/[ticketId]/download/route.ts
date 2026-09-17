import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { fetchTicketProofAttachment } from '@/lib/ticket-proof-fetch';

type RouteContext = { params: Promise<{ ticketId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { ticketId } = await context.params;

  const ticket = await prisma.nightlifeTicket.findUnique({
    where: { id: ticketId },
    select: {
      sellerId: true,
      buyerId: true,
      status: true,
      title: true,
      ticketProofUrl: true,
      ticketProofMime: true,
      ticketProofData: true,
    },
  });

  const isSeller = ticket?.sellerId === user.id;
  const isBuyer = ticket?.buyerId === user.id && ticket.status === 'sold';
  if (!ticket || (!isSeller && !isBuyer)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const attachment = await fetchTicketProofAttachment(
    ticket.ticketProofUrl ?? '',
    ticket.ticketProofMime ?? 'image/jpeg',
    ticket.title,
    ticket.ticketProofData,
  );

  if (!attachment) {
    return NextResponse.json({ error: 'Ticket file isn’t available yet.' }, { status: 404 });
  }

  const safeName = attachment.filename.replace(/"/g, '');

  return new NextResponse(new Uint8Array(attachment.buffer), {
    headers: {
      'Content-Type': attachment.contentType,
      'Content-Disposition': `attachment; filename="${safeName}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
