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
      title: true,
      ticketProofUrl: true,
      ticketProofMime: true,
      ticketProofData: true,
    },
  });

  if (!ticket || ticket.sellerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const attachment = await fetchTicketProofAttachment(
    ticket.ticketProofUrl ?? '',
    ticket.ticketProofMime ?? 'image/jpeg',
    ticket.title,
    ticket.ticketProofData,
  );

  if (!attachment) {
    return NextResponse.json({ error: 'No preview' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(attachment.buffer), {
    headers: {
      'Content-Type': attachment.contentType,
      'Cache-Control': 'private, no-store',
    },
  });
}
