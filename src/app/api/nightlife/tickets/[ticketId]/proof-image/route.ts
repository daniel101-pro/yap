import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { isAllowedTicketProofUrl } from '@/lib/ticket-proof';

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
      ticketProofUrl: true,
      ticketProofMime: true,
      ticketProofData: true,
    },
  });

  if (!ticket || ticket.sellerId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const mime = ticket.ticketProofMime ?? 'image/jpeg';

  if (ticket.ticketProofData && ticket.ticketProofData.length > 0) {
    const body = Buffer.from(ticket.ticketProofData);
    return new NextResponse(body, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  if (ticket.ticketProofUrl && isAllowedTicketProofUrl(ticket.ticketProofUrl)) {
    const res = await fetch(ticket.ticketProofUrl);
    if (!res.ok) {
      return NextResponse.json({ error: 'Could not load image' }, { status: 502 });
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || mime;
    return new NextResponse(buf, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  return NextResponse.json({ error: 'No preview' }, { status: 404 });
}
