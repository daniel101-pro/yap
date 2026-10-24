import { NextRequest, NextResponse } from 'next/server';
import {
  ingestReceivedEmail,
  updateOutboundStatus,
} from '@/lib/admin-inbox';
import { getResendWebhookSecret, verifyResendWebhook } from '@/lib/resend-webhook';

export const runtime = 'nodejs';

interface ResendWebhookEvent {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    message_id?: string;
    created_at?: string;
  };
}

function outboundStatus(type: string): string | null {
  if (type === 'email.sent') return 'sent';
  if (type === 'email.delivered') return 'delivered';
  if (type === 'email.delivery_delayed') return 'delayed';
  if (type === 'email.bounced') return 'bounced';
  if (type === 'email.complained') return 'complained';
  if (type === 'email.failed' || type === 'email.suppressed') return 'failed';
  return null;
}

export async function POST(request: NextRequest) {
  const secret = getResendWebhookSecret();
  if (!secret) {
    return NextResponse.json({ error: 'Resend webhook is not configured' }, { status: 503 });
  }

  const payload = await request.text();
  if (!verifyResendWebhook(payload, request.headers, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(payload) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = event.type ?? '';
  const emailId = event.data?.email_id;

  try {
    if (type === 'email.received' && emailId) {
      await ingestReceivedEmail({
        email_id: emailId,
        from: event.data?.from,
        to: event.data?.to,
        cc: event.data?.cc,
        bcc: event.data?.bcc,
        subject: event.data?.subject,
        message_id: event.data?.message_id,
        created_at: event.data?.created_at,
      });
    } else if (emailId) {
      const status = outboundStatus(type);
      if (status) await updateOutboundStatus(emailId, status);
    }
  } catch (error) {
    console.error('[resend webhook]', error);
    return NextResponse.json({ error: 'Inbox ingest failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
