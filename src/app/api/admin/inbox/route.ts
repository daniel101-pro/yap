import { NextRequest, NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { publicErrorMessage } from '@/lib/security';
import {
  EMAIL_LIMITS,
  isInboxFolder,
  listInboxThreads,
  parseAddressList,
  patchInboxThreads,
  sendAdminEmail,
  syncReceivedEmails,
  type OutboundAttachment,
} from '@/lib/admin-inbox';

function parseOutboundAttachments(raw: unknown): OutboundAttachment[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length > EMAIL_LIMITS.attachments) {
    throw new Error(`Too many attachments (max ${EMAIL_LIMITS.attachments})`);
  }

  return raw.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error('Invalid attachment');
    const record = item as { filename?: unknown; contentType?: unknown; content?: unknown };
    const filename = typeof record.filename === 'string' ? record.filename.trim().slice(0, 180) : '';
    const contentType = typeof record.contentType === 'string' ? record.contentType : 'application/octet-stream';
    const encoded = typeof record.content === 'string' ? record.content : '';
    if (!filename || !encoded) throw new Error(`Attachment ${index + 1} is incomplete`);
    const content = Buffer.from(encoded, 'base64');
    if (content.length > EMAIL_LIMITS.attachmentBytes) {
      throw new Error(`${filename} is too large (max 8 MB)`);
    }
    return { filename, contentType, content };
  });
}

export async function GET(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const folderParam = request.nextUrl.searchParams.get('folder') ?? 'inbox';
  const folder = isInboxFolder(folderParam) ? folderParam : 'inbox';
  const query = request.nextUrl.searchParams.get('q') ?? '';
  const page = Number(request.nextUrl.searchParams.get('page') ?? 1);

  const data = await listInboxThreads({ folder, query, page });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session?.user?.email) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const limit = checkRateLimit(`admin-inbox-send:${session.user.email}`, 30, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ error: 'Sending too quickly. Wait a minute.' }, { status: 429 });
  }

  try {
    const body = (await request.json()) as {
      action?: string;
      to?: unknown;
      cc?: unknown;
      bcc?: unknown;
      subject?: unknown;
      body?: unknown;
      threadId?: unknown;
      replyToMessageId?: unknown;
      draftId?: unknown;
      saveDraft?: unknown;
      attachments?: unknown;
    };

    if (body.action === 'sync') {
      const result = await syncReceivedEmails();
      return NextResponse.json(result);
    }

    const text = typeof body.body === 'string' ? body.body : '';
    if (text.length > EMAIL_LIMITS.body) {
      return NextResponse.json({ error: `Message is too long (max ${EMAIL_LIMITS.body} characters)` }, { status: 400 });
    }

    const result = await sendAdminEmail({
      to: parseAddressList(body.to),
      cc: parseAddressList(body.cc),
      bcc: parseAddressList(body.bcc),
      subject: typeof body.subject === 'string' ? body.subject : '',
      body: text,
      threadId: typeof body.threadId === 'string' ? body.threadId : null,
      replyToMessageId: typeof body.replyToMessageId === 'string' ? body.replyToMessageId : null,
      draftId: typeof body.draftId === 'string' ? body.draftId : null,
      sentByEmail: session.user.email,
      attachments: parseOutboundAttachments(body.attachments),
      saveDraft: body.saveDraft === true || body.action === 'draft',
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not send email';
    return NextResponse.json({ error: publicErrorMessage(error, message) }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdminApi();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = (await request.json()) as {
      ids?: unknown;
      read?: unknown;
      starred?: unknown;
      archived?: unknown;
      trashed?: unknown;
    };
    const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === 'string') : [];
    const updated = await patchInboxThreads(ids, {
      read: typeof body.read === 'boolean' ? body.read : undefined,
      starred: typeof body.starred === 'boolean' ? body.starred : undefined,
      archived: typeof body.archived === 'boolean' ? body.archived : undefined,
      trashed: typeof body.trashed === 'boolean' ? body.trashed : undefined,
    });
    return NextResponse.json({ updated });
  } catch (error) {
    return NextResponse.json(
      { error: publicErrorMessage(error, 'Could not update messages') },
      { status: 400 },
    );
  }
}
