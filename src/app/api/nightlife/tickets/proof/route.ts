import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import { getSessionUser } from '@/lib/auth-session';
import { checkRateLimit } from '@/lib/rate-limit';
import { sanitizeUploadBytes } from '@/lib/media-safety';
import {
  detectTicketProofType,
  TICKET_PROOF_MAX_BYTES,
  ticketProofExtension,
} from '@/lib/ticket-proof';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = checkRateLimit(`ticket-proof:${user.id}`, 10, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many uploads. Please slow down.' }, { status: 429 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (file.size > TICKET_PROOF_MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 8MB)' }, { status: 400 });
  }

  const rawBytes = new Uint8Array(await file.arrayBuffer());
  const detectedType = detectTicketProofType(rawBytes);
  if (!detectedType) {
    return NextResponse.json({ error: 'Upload a ticket screenshot (JPEG/PNG) or PDF' }, { status: 400 });
  }

  const bytes =
    detectedType.startsWith('image/') ? sanitizeUploadBytes(detectedType, rawBytes) : rawBytes;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({
      storage: 'inline',
      mime: detectedType,
      data: Buffer.from(bytes).toString('base64'),
    });
  }

  const ext = ticketProofExtension(detectedType);
  const filename = `nightlife-tickets/${user.id}/${randomUUID()}${ext}`;

  const blob = await put(filename, Buffer.from(bytes), {
    access: 'private',
    contentType: detectedType,
    addRandomSuffix: false,
  });

  return NextResponse.json({
    storage: 'blob',
    url: blob.url,
    pathname: blob.pathname,
    mime: detectedType,
    data: Buffer.from(bytes).toString('base64'),
  });
}
