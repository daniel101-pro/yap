import { getResendApiKey } from '@/lib/env';

const RESEND_API = 'https://api.resend.com';

export interface ReceivedEmailAttachment {
  id: string;
  filename: string | null;
  content_type: string | null;
  content_disposition: string | null;
  content_id: string | null;
  size?: number;
}

export interface ReceivedEmail {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  reply_to?: string[];
  subject: string | null;
  html: string | null;
  text: string | null;
  headers?: Record<string, string>;
  message_id?: string | null;
  created_at?: string;
  attachments?: ReceivedEmailAttachment[];
}

export interface ReceivedEmailListItem {
  id: string;
  from: string;
  to: string[];
  subject: string | null;
  created_at: string;
}

async function resendFetch(path: string, init?: RequestInit) {
  const key = getResendApiKey();
  if (!key) {
    throw new Error('Resend is not configured');
  }

  const response = await fetch(`${RESEND_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend ${response.status}${detail ? `: ${detail.slice(0, 240)}` : ''}`);
  }

  return response;
}

export async function fetchReceivedEmail(emailId: string): Promise<ReceivedEmail> {
  const response = await resendFetch(`/emails/receiving/${encodeURIComponent(emailId)}`);
  return (await response.json()) as ReceivedEmail;
}

export async function listReceivedEmails(limit = 40): Promise<ReceivedEmailListItem[]> {
  const response = await resendFetch(`/emails/receiving?limit=${Math.min(100, Math.max(1, limit))}`);
  const json = (await response.json()) as { data?: ReceivedEmailListItem[] };
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchReceivedAttachmentDownloadUrl(
  emailId: string,
  attachmentId: string,
): Promise<{ download_url: string; expires_at?: string; filename?: string; content_type?: string }> {
  const response = await resendFetch(
    `/emails/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
  return (await response.json()) as {
    download_url: string;
    expires_at?: string;
    filename?: string;
    content_type?: string;
  };
}
