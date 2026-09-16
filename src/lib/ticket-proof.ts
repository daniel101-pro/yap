import { detectMediaType } from '@/lib/media-safety';

const PROOF_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

export const TICKET_PROOF_MAX_BYTES = 8 * 1024 * 1024;

export function decodeTicketProofBase64(raw: string): Buffer | null {
  try {
    const buf = Buffer.from(raw, 'base64');
    if (buf.length === 0 || buf.length > TICKET_PROOF_MAX_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

export function detectTicketProofType(bytes: Uint8Array): string | null {
  const imageOrVideo = detectMediaType(bytes);
  if (imageOrVideo?.startsWith('image/')) return imageOrVideo;

  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }

  return null;
}

export function ticketProofExtension(mime: string): string {
  return PROOF_EXT[mime] ?? '.bin';
}

export function isAllowedTicketProofUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes('/nightlife-tickets/');
  } catch {
    return false;
  }
}

export function ticketProofEmailFilename(title: string, mime: string): string {
  const safe = title.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').slice(0, 48) || 'ticket';
  return `yap-${safe}${ticketProofExtension(mime)}`;
}
