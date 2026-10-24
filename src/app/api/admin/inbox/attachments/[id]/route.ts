import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminApi } from '@/lib/admin-auth';
import { fetchReceivedAttachmentDownloadUrl } from '@/lib/resend-receiving';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const attachment = await prisma.adminEmailAttachment.findUnique({
    where: { id },
    include: { email: { select: { resendEmailId: true, direction: true } } },
  });

  if (!attachment?.email.resendEmailId || !attachment.resendAttachmentId) {
    return NextResponse.json({ error: 'Attachment is not available' }, { status: 404 });
  }

  try {
    const remote = await fetchReceivedAttachmentDownloadUrl(
      attachment.email.resendEmailId,
      attachment.resendAttachmentId,
    );
    const file = await fetch(remote.download_url);
    if (!file.ok) {
      return NextResponse.json({ error: 'Could not download attachment' }, { status: 502 });
    }

    const bytes = await file.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': remote.content_type || attachment.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${attachment.filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not fetch attachment' }, { status: 502 });
  }
}
