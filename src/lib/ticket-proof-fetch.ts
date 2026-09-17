import { get } from '@vercel/blob';
import { ticketProofEmailFilename } from '@/lib/ticket-proof';

export function bufferFromTicketProofRecord(options: {
  ticketProofData: Buffer | Uint8Array | null | undefined;
  ticketProofUrl: string | null | undefined;
  ticketProofMime: string | null | undefined;
  title: string;
}): { buffer: Buffer; filename: string; contentType: string } | null {
  const mime = options.ticketProofMime ?? 'image/jpeg';

  if (options.ticketProofData && options.ticketProofData.length > 0) {
    const buffer = Buffer.isBuffer(options.ticketProofData)
      ? options.ticketProofData
      : Buffer.from(options.ticketProofData);
    return {
      buffer,
      filename: ticketProofEmailFilename(options.title, mime),
      contentType: mime,
    };
  }

  return null;
}

export async function fetchTicketProofAttachment(
  proofUrl: string,
  mime: string,
  title: string,
  proofData?: Buffer | Uint8Array | null,
): Promise<{ buffer: Buffer; filename: string; contentType: string } | null> {
  const fromDb = bufferFromTicketProofRecord({
    ticketProofData: proofData,
    ticketProofUrl: proofUrl,
    ticketProofMime: mime,
    title,
  });
  if (fromDb) return fromDb;

  if (!proofUrl) return null;

  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  let buffer: Buffer | null = null;
  let contentType = mime;

  try {
    const blob = await get(proofUrl, { access: 'private', token });
    if (blob && blob.statusCode === 200 && blob.stream) {
      buffer = Buffer.from(await new Response(blob.stream).arrayBuffer());
      contentType = blob.blob.contentType || mime;
    }
  } catch {
    buffer = null;
  }

  if (!buffer?.length) {
    const res = await fetch(proofUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    buffer = Buffer.from(await res.arrayBuffer());
    contentType = mime || res.headers.get('content-type') || 'application/octet-stream';
  }

  if (!buffer.length) return null;

  const type = (contentType || 'application/octet-stream').split(';')[0].trim();

  return {
    buffer,
    filename: ticketProofEmailFilename(title, type),
    contentType: type,
  };
}
