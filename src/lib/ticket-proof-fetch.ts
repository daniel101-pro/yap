import { get } from '@vercel/blob';
import { ticketProofEmailFilename } from '@/lib/ticket-proof';

function asBuffer(data: Buffer | Uint8Array | null | undefined): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data.length > 0 ? data : null;
  if (data instanceof Uint8Array) return data.length > 0 ? Buffer.from(data) : null;
  return null;
}

export function bufferFromTicketProofRecord(options: {
  ticketProofData: Buffer | Uint8Array | null | undefined;
  ticketProofUrl: string | null | undefined;
  ticketProofMime: string | null | undefined;
  title: string;
}): { buffer: Buffer; filename: string; contentType: string } | null {
  const mime = options.ticketProofMime ?? 'image/jpeg';
  const buffer = asBuffer(options.ticketProofData);
  if (!buffer) return null;
  return {
    buffer,
    filename: ticketProofEmailFilename(options.title, mime),
    contentType: mime,
  };
}

function extractBlobPathname(url: string): string | null {
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname).replace(/^\//, '');
    return path || null;
  } catch {
    return null;
  }
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array> | NodeJS.ReadableStream | null | undefined,
): Promise<Buffer | null> {
  if (!stream) return null;
  const buffer = Buffer.from(await new Response(stream as ReadableStream).arrayBuffer());
  return buffer.length > 0 ? buffer : null;
}

async function fetchPrivateBlob(
  proofUrl: string,
  mime: string,
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const pathname = extractBlobPathname(proofUrl);
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const keys = [pathname, proofUrl].filter((k): k is string => Boolean(k));

  for (const key of keys) {
    try {
      const blob = await get(key, {
        access: 'private',
        ...(token ? { token } : {}),
      });
      if (!blob || blob.statusCode !== 200) continue;
      const buffer = await streamToBuffer(blob.stream);
      if (!buffer) continue;
      return {
        buffer,
        contentType: blob.blob.contentType || mime,
      };
    } catch {
      continue;
    }
  }

  if (token) {
    try {
      const res = await fetch(proofUrl, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 0) {
          return {
            buffer,
            contentType: mime || res.headers.get('content-type') || 'application/octet-stream',
          };
        }
      }
    } catch {
      /* fall through */
    }
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

  const fromBlob = await fetchPrivateBlob(proofUrl, mime);
  if (!fromBlob) return null;

  const type = (fromBlob.contentType || 'application/octet-stream').split(';')[0]!.trim();
  return {
    buffer: fromBlob.buffer,
    filename: ticketProofEmailFilename(title, type),
    contentType: type,
  };
}
