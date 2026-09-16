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

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  const res = await fetch(proofUrl, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!res.ok) return null;

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0) return null;

  const contentType = mime || res.headers.get('content-type') || 'application/octet-stream';

  return {
    buffer,
    filename: ticketProofEmailFilename(title, contentType.split(';')[0].trim()),
    contentType: contentType.split(';')[0].trim(),
  };
}
