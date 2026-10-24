import { prisma } from '@/lib/prisma';
import { getResendClient } from '@/lib/email';
import { getResendApiKey } from '@/lib/env';
import { getResendWebhookSecret } from '@/lib/resend-webhook';
import {
  fetchReceivedEmail,
  listReceivedEmails,
  type ReceivedEmail,
} from '@/lib/resend-receiving';

export const INBOX_FOLDERS = ['inbox', 'starred', 'sent', 'drafts', 'archive', 'trash'] as const;
export type InboxFolder = (typeof INBOX_FOLDERS)[number];

export const EMAIL_LIMITS = {
  subject: 200,
  body: 20_000,
  recipients: 20,
  attachments: 5,
  attachmentBytes: 8 * 1024 * 1024,
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getInboxAddress(): string {
  const explicit = process.env.EMAIL_INBOX_ADDRESS?.trim().toLowerCase();
  if (explicit) return explicit;
  const from = parseAddress(process.env.EMAIL_FROM?.replace(/^"|"$/g, '') ?? 'YAP <hello@yap.college>');
  if (from.email.startsWith('noreply@')) {
    return `hello@${from.email.split('@')[1] ?? 'yap.college'}`;
  }
  return from.email || 'hello@yap.college';
}

export function getInboxFromHeader(): string {
  const explicit = process.env.EMAIL_INBOX_FROM?.replace(/^"|"$/g, '').trim();
  if (explicit) return explicit;
  return `YAP <${getInboxAddress()}>`;
}

export async function getReceiveHealth() {
  const key = getResendApiKey();
  if (!key) {
    return { canReadInbox: false, reason: 'missing_api_key' as const };
  }

  try {
    const response = await fetch('https://api.resend.com/emails/receiving?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    });
    if (response.ok) {
      return { canReadInbox: true, reason: null };
    }
    const body = (await response.json().catch(() => ({}))) as { name?: string; message?: string };
    if (body.name === 'restricted_api_key' || response.status === 401) {
      return { canReadInbox: false, reason: 'restricted_api_key' as const };
    }
    return { canReadInbox: false, reason: 'receive_api_error' as const };
  } catch {
    return { canReadInbox: false, reason: 'receive_api_error' as const };
  }
}

export async function getInboxConfig() {
  const address = getInboxAddress();
  const receive = await getReceiveHealth();
  return {
    address,
    from: getInboxFromHeader(),
    resendConfigured: Boolean(getResendApiKey()),
    webhookConfigured: Boolean(getResendWebhookSecret()),
    canReadInbox: receive.canReadInbox,
    receiveBlocker: receive.reason,
  };
}

export function isInboxFolder(value: unknown): value is InboxFolder {
  return typeof value === 'string' && (INBOX_FOLDERS as readonly string[]).includes(value);
}

export function parseAddress(raw: string): { name: string | null; email: string } {
  const value = raw.trim().replace(/^"|"$/g, '');
  const angled = value.match(/^(.*)<([^>]+)>\s*$/);
  if (angled) {
    return {
      name: angled[1].trim().replace(/^"|"$/g, '') || null,
      email: angled[2].trim().toLowerCase(),
    };
  }
  return { name: null, email: value.toLowerCase() };
}

export function parseAddressList(value: unknown): string[] {
  const parts = Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'string' ? item.split(',') : []))
    : typeof value === 'string'
      ? value.split(/[,;]/)
      : [];

  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of parts) {
    const { email } = parseAddress(part);
    if (!EMAIL_RE.test(email) || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function normalizeSubject(subject: string): string {
  return subject
    .replace(/^((re|fw|fwd)\s*:\s*)+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function makeSnippet(text: string, html: string): string {
  const source = text.trim() || stripHtml(html);
  return source.slice(0, 160);
}

export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;white-space:pre-wrap">${escaped}</div>`;
}

export function quotePlain(original: { fromEmail: string; fromName: string | null; createdAt: Date; textBody: string; htmlBody: string }) {
  const who = original.fromName ? `${original.fromName} <${original.fromEmail}>` : original.fromEmail;
  const when = original.createdAt.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const body = original.textBody.trim() || stripHtml(original.htmlBody);
  const quoted = body
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return `On ${when}, ${who} wrote:\n${quoted}`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function headerLookup(headers: Record<string, string> | undefined, name: string): string {
  if (!headers) return '';
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return '';
}

async function refreshThreadMeta(threadId: string) {
  const messages = await prisma.adminEmail.findMany({
    where: { threadId, isDraft: false, trashed: false },
    orderBy: { createdAt: 'desc' },
  });

  const participants = new Set<string>();
  for (const message of messages) {
    participants.add(message.fromEmail.toLowerCase());
    for (const email of asStringArray(message.toEmails)) participants.add(email.toLowerCase());
    for (const email of asStringArray(message.ccEmails)) participants.add(email.toLowerCase());
  }

  const latest = messages[0];
  const unreadCount = messages.filter((message) => message.direction === 'inbound' && !message.read).length;

  await prisma.adminEmailThread.update({
    where: { id: threadId },
    data: {
      snippet: latest?.snippet ?? '',
      lastMessageAt: latest?.createdAt ?? new Date(),
      unreadCount,
      participants: [...participants],
      starred: messages.some((message) => message.starred),
    },
  });
}

async function findThreadForInbound(input: {
  messageId?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
  subject: string;
  participants: string[];
}) {
  const ids = [input.inReplyTo, input.references]
    .filter(Boolean)
    .join(' ')
    .match(/<[^>]+>/g);

  if (ids?.length) {
    const match = await prisma.adminEmail.findFirst({
      where: { messageId: { in: ids } },
      select: { threadId: true },
    });
    if (match) return match.threadId;
  }

  const normalized = normalizeSubject(input.subject);
  if (!normalized || input.participants.length === 0) return null;

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.adminEmailThread.findMany({
    where: {
      normalizedSubject: normalized,
      trashed: false,
      lastMessageAt: { gte: since },
    },
    take: 20,
  });

  for (const candidate of candidates) {
    const people = asStringArray(candidate.participants);
    if (people.some((email) => input.participants.includes(email.toLowerCase()))) {
      return candidate.id;
    }
  }

  return null;
}

export async function ingestReceivedEmail(meta: {
  email_id: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string | null;
  message_id?: string | null;
  created_at?: string;
}) {
  const existing = await prisma.adminEmail.findUnique({
    where: { resendEmailId: meta.email_id },
    select: { id: true, threadId: true },
  });
  if (existing) {
    await hydrateInboundBody(existing.id, meta.email_id);
    return existing;
  }

  let full: ReceivedEmail | null = null;
  try {
    full = await fetchReceivedEmail(meta.email_id);
  } catch (error) {
    console.error('[inbox] fetch received email', error);
  }

  const fromRaw = full?.from || meta.from || '';
  const from = parseAddress(fromRaw);
  const toEmails = parseAddressList(full?.to ?? meta.to ?? []);
  const ccEmails = parseAddressList(full?.cc ?? meta.cc ?? []);
  const bccEmails = parseAddressList(full?.bcc ?? meta.bcc ?? []);
  const subject = (full?.subject ?? meta.subject ?? '(no subject)').trim() || '(no subject)';
  const textBody = full?.text ?? '';
  const htmlBody = full?.html ?? '';
  const snippet = makeSnippet(textBody, htmlBody);
  const messageId = full?.message_id ?? meta.message_id ?? null;
  const inReplyTo = headerLookup(full?.headers, 'in-reply-to') || null;
  const referencesHeader = headerLookup(full?.headers, 'references') || null;
  const createdAt = full?.created_at || meta.created_at ? new Date(full?.created_at || meta.created_at!) : new Date();

  const participants = [...new Set([from.email, ...toEmails, ...ccEmails].filter(Boolean))];
  let threadId = await findThreadForInbound({
    messageId,
    inReplyTo,
    references: referencesHeader,
    subject,
    participants,
  });

  if (!threadId) {
    const thread = await prisma.adminEmailThread.create({
      data: {
        subject,
        normalizedSubject: normalizeSubject(subject) || subject.toLowerCase(),
        snippet,
        lastMessageAt: createdAt,
        unreadCount: 1,
        participants,
      },
    });
    threadId = thread.id;
  } else {
    await prisma.adminEmailThread.update({
      where: { id: threadId },
      data: { archived: false, trashed: false },
    });
  }

  const email = await prisma.adminEmail.create({
    data: {
      threadId,
      direction: 'inbound',
      fromName: from.name,
      fromEmail: from.email || 'unknown@unknown',
      toEmails,
      ccEmails,
      bccEmails,
      replyTo: parseAddressList(full?.reply_to ?? [])[0] ?? null,
      subject,
      textBody,
      htmlBody,
      snippet,
      read: false,
      resendEmailId: meta.email_id,
      messageId,
      inReplyTo,
      referencesHeader,
      resendStatus: 'received',
      createdAt,
      attachments: {
        create: (full?.attachments ?? []).map((attachment) => ({
          filename: attachment.filename || 'attachment',
          contentType: attachment.content_type || 'application/octet-stream',
          size: attachment.size ?? 0,
          contentId: attachment.content_id,
          disposition: attachment.content_disposition,
          resendAttachmentId: attachment.id,
        })),
      },
    },
  });

  await refreshThreadMeta(threadId);
  return email;
}

export async function hydrateInboundBody(emailId: string, resendEmailId: string) {
  const current = await prisma.adminEmail.findUnique({ where: { id: emailId } });
  if (!current || current.htmlBody || current.textBody) return current;

  try {
    const full = await fetchReceivedEmail(resendEmailId);
    const textBody = full.text ?? '';
    const htmlBody = full.html ?? '';
    const updated = await prisma.adminEmail.update({
      where: { id: emailId },
      data: {
        textBody,
        htmlBody,
        snippet: makeSnippet(textBody, htmlBody) || current.snippet,
        messageId: full.message_id ?? current.messageId,
        inReplyTo: headerLookup(full.headers, 'in-reply-to') || current.inReplyTo,
        referencesHeader: headerLookup(full.headers, 'references') || current.referencesHeader,
      },
    });
    await refreshThreadMeta(current.threadId);
    return updated;
  } catch (error) {
    console.error('[inbox] hydrate inbound', error);
    return current;
  }
}

export async function syncReceivedEmails() {
  const listed = await listReceivedEmails(50);
  let imported = 0;
  for (const item of listed) {
    const before = await prisma.adminEmail.findUnique({
      where: { resendEmailId: item.id },
      select: { id: true },
    });
    await ingestReceivedEmail({
      email_id: item.id,
      from: item.from,
      to: item.to,
      subject: item.subject,
      created_at: item.created_at,
    });
    if (!before) imported += 1;
  }
  return { scanned: listed.length, imported };
}

export async function updateOutboundStatus(resendEmailId: string, status: string) {
  const email = await prisma.adminEmail.findUnique({ where: { resendEmailId } });
  if (!email) return null;
  return prisma.adminEmail.update({
    where: { id: email.id },
    data: { resendStatus: status },
  });
}

export interface OutboundAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

export async function sendAdminEmail(input: {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  threadId?: string | null;
  replyToMessageId?: string | null;
  draftId?: string | null;
  sentByEmail: string;
  attachments?: OutboundAttachment[];
  saveDraft?: boolean;
}) {
  const to = parseAddressList(input.to);
  const cc = parseAddressList(input.cc ?? []);
  const bcc = parseAddressList(input.bcc ?? []);
  if (to.length === 0) throw new Error('Add at least one recipient');
  if (to.length + cc.length + bcc.length > EMAIL_LIMITS.recipients) {
    throw new Error(`Too many recipients (max ${EMAIL_LIMITS.recipients})`);
  }

  const subject = input.subject.trim().slice(0, EMAIL_LIMITS.subject) || '(no subject)';
  const textBody = input.body.slice(0, EMAIL_LIMITS.body);
  const htmlBody = textToHtml(textBody);
  const snippet = makeSnippet(textBody, htmlBody);
  const from = parseAddress(getInboxFromHeader());
  const messageId = `<yap.${crypto.randomUUID()}@yap.college>`;

  let inReplyTo: string | null = null;
  let referencesHeader: string | null = null;
  let threadId = input.threadId ?? null;

  if (input.replyToMessageId) {
    const original = await prisma.adminEmail.findUnique({ where: { id: input.replyToMessageId } });
    if (original) {
      threadId = original.threadId;
      inReplyTo = original.messageId;
      referencesHeader = [original.referencesHeader, original.messageId].filter(Boolean).join(' ') || null;
    }
  }

  if (!threadId) {
    const thread = await prisma.adminEmailThread.create({
      data: {
        subject,
        normalizedSubject: normalizeSubject(subject) || subject.toLowerCase(),
        snippet,
        lastMessageAt: new Date(),
        unreadCount: 0,
        participants: [...new Set([from.email, ...to, ...cc])],
      },
    });
    threadId = thread.id;
  }

  const data = {
    threadId,
    direction: 'outbound' as const,
    isDraft: Boolean(input.saveDraft),
    fromName: from.name,
    fromEmail: from.email,
    toEmails: to,
    ccEmails: cc,
    bccEmails: bcc,
    replyTo: getInboxAddress(),
    subject,
    textBody,
    htmlBody,
    snippet,
    read: true,
    messageId,
    inReplyTo,
    referencesHeader,
    sentByEmail: input.sentByEmail,
    resendStatus: input.saveDraft ? 'draft' : 'queued',
  };

  const email = input.draftId
    ? await prisma.adminEmail.update({
        where: { id: input.draftId },
        data,
      })
    : await prisma.adminEmail.create({ data });

  if (input.saveDraft) {
    await refreshThreadMeta(threadId);
    return { email, threadId };
  }

  const resend = getResendClient();
  if (!resend) {
    throw new Error('Resend is not configured');
  }

  const { data: sent, error } = await resend.emails.send({
    from: getInboxFromHeader(),
    to,
    cc: cc.length ? cc : undefined,
    bcc: bcc.length ? bcc : undefined,
    replyTo: getInboxAddress(),
    subject,
    text: textBody,
    html: htmlBody,
    headers: {
      ...(inReplyTo ? { 'In-Reply-To': inReplyTo } : {}),
      ...(referencesHeader ? { References: referencesHeader } : {}),
    },
    attachments: input.attachments?.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  });

  if (error || !sent?.id) {
    await prisma.adminEmail.update({
      where: { id: email.id },
      data: { resendStatus: 'failed', isDraft: true },
    });
    throw new Error(error?.message ?? 'Resend could not send that email');
  }

  const saved = await prisma.adminEmail.update({
    where: { id: email.id },
    data: {
      resendEmailId: sent.id,
      resendStatus: 'sent',
      isDraft: false,
    },
  });

  if (input.attachments?.length) {
    await prisma.adminEmailAttachment.createMany({
      data: input.attachments.map((attachment) => ({
        emailId: saved.id,
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.content.length,
      })),
    });
  }

  await refreshThreadMeta(threadId);
  return { email: saved, threadId };
}

export async function listInboxThreads(options: {
  folder: InboxFolder;
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(80, Math.max(10, options.pageSize ?? 40));
  const q = options.query?.trim();

  const where = threadWhere(options.folder, q);

  const [threads, total, counts] = await Promise.all([
    prisma.adminEmailThread.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        messages: {
          where: { isDraft: options.folder === 'drafts' ? true : undefined },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.adminEmailThread.count({ where }),
    folderCounts(),
  ]);

  return {
    folder: options.folder,
    page,
    pageSize,
    total,
    counts,
    config: await getInboxConfig(),
    threads: threads.map((thread) => {
      const latest = thread.messages[0];
      return {
        id: thread.id,
        subject: thread.subject,
        snippet: thread.snippet,
        lastMessageAt: thread.lastMessageAt.toISOString(),
        starred: thread.starred,
        archived: thread.archived,
        trashed: thread.trashed,
        unreadCount: thread.unreadCount,
        participants: asStringArray(thread.participants),
        fromName: latest?.fromName ?? null,
        fromEmail: latest?.fromEmail ?? '',
        direction: latest?.direction ?? 'inbound',
        isDraft: Boolean(latest?.isDraft),
      };
    }),
  };
}

function threadWhere(folder: InboxFolder, query?: string) {
  const search = query
    ? {
        OR: [
          { subject: { contains: query, mode: 'insensitive' as const } },
          { snippet: { contains: query, mode: 'insensitive' as const } },
          { messages: { some: { fromEmail: { contains: query, mode: 'insensitive' as const } } } },
        ],
      }
    : {};

  if (folder === 'starred') return { starred: true, trashed: false, ...search };
  if (folder === 'archive') return { archived: true, trashed: false, ...search };
  if (folder === 'trash') return { trashed: true, ...search };
  if (folder === 'sent') {
    return {
      trashed: false,
      messages: { some: { direction: 'outbound', isDraft: false } },
      ...search,
    };
  }
  if (folder === 'drafts') {
    return {
      trashed: false,
      messages: { some: { isDraft: true } },
      ...search,
    };
  }
  return { archived: false, trashed: false, messages: { some: { isDraft: false } }, ...search };
}

export async function folderCounts() {
  const [inbox, starred, sent, drafts, archive, trash, unread] = await Promise.all([
    prisma.adminEmailThread.count({
      where: { archived: false, trashed: false, messages: { some: { isDraft: false } } },
    }),
    prisma.adminEmailThread.count({ where: { starred: true, trashed: false } }),
    prisma.adminEmailThread.count({
      where: { trashed: false, messages: { some: { direction: 'outbound', isDraft: false } } },
    }),
    prisma.adminEmail.count({ where: { isDraft: true, trashed: false } }),
    prisma.adminEmailThread.count({ where: { archived: true, trashed: false } }),
    prisma.adminEmailThread.count({ where: { trashed: true } }),
    prisma.adminEmail.count({
      where: { direction: 'inbound', read: false, trashed: false, isDraft: false, thread: { archived: false, trashed: false } },
    }),
  ]);

  return { inbox, starred, sent, drafts, archive, trash, unread };
}

export async function getInboxThread(threadId: string) {
  const thread = await prisma.adminEmailThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { attachments: true },
      },
    },
  });
  if (!thread) return null;

  await Promise.all(
    thread.messages
      .filter((message) => message.direction === 'inbound' && !message.htmlBody && !message.textBody && message.resendEmailId)
      .map((message) => hydrateInboundBody(message.id, message.resendEmailId!)),
  );

  const fresh = await prisma.adminEmailThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { attachments: true },
      },
    },
  });
  if (!fresh) return null;

  const unreadIds = fresh.messages
    .filter((message) => message.direction === 'inbound' && !message.read)
    .map((message) => message.id);

  if (unreadIds.length) {
    await prisma.adminEmail.updateMany({ where: { id: { in: unreadIds } }, data: { read: true } });
    await refreshThreadMeta(threadId);
  }

  const latest = await prisma.adminEmailThread.findUnique({
    where: { id: threadId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { attachments: true },
      },
    },
  });
  if (!latest) return null;

  return serializeThread(latest);
}

function serializeThread(thread: {
  id: string;
  subject: string;
  snippet: string;
  lastMessageAt: Date;
  starred: boolean;
  archived: boolean;
  trashed: boolean;
  unreadCount: number;
  participants: unknown;
  messages: Array<{
    id: string;
    direction: string;
    isDraft: boolean;
    fromName: string | null;
    fromEmail: string;
    toEmails: unknown;
    ccEmails: unknown;
    bccEmails: unknown;
    subject: string;
    textBody: string;
    htmlBody: string;
    snippet: string;
    read: boolean;
    starred: boolean;
    resendStatus: string | null;
    sentByEmail: string | null;
    createdAt: Date;
    attachments: Array<{
      id: string;
      filename: string;
      contentType: string;
      size: number;
    }>;
  }>;
}) {
  return {
    id: thread.id,
    subject: thread.subject,
    snippet: thread.snippet,
    lastMessageAt: thread.lastMessageAt.toISOString(),
    starred: thread.starred,
    archived: thread.archived,
    trashed: thread.trashed,
    unreadCount: thread.unreadCount,
    participants: asStringArray(thread.participants),
    messages: thread.messages.map((message) => ({
      id: message.id,
      direction: message.direction,
      isDraft: message.isDraft,
      fromName: message.fromName,
      fromEmail: message.fromEmail,
      to: asStringArray(message.toEmails),
      cc: asStringArray(message.ccEmails),
      bcc: asStringArray(message.bccEmails),
      subject: message.subject,
      textBody: message.textBody,
      htmlBody: message.htmlBody,
      snippet: message.snippet,
      read: message.read,
      starred: message.starred,
      resendStatus: message.resendStatus,
      sentByEmail: message.sentByEmail,
      createdAt: message.createdAt.toISOString(),
      attachments: message.attachments.map((attachment) => ({
        id: attachment.id,
        filename: attachment.filename,
        contentType: attachment.contentType,
        size: attachment.size,
      })),
    })),
  };
}

export async function patchInboxThreads(
  ids: string[],
  patch: { read?: boolean; starred?: boolean; archived?: boolean; trashed?: boolean },
) {
  if (ids.length === 0) return 0;

  await prisma.adminEmailThread.updateMany({
    where: { id: { in: ids } },
    data: {
      ...(patch.starred !== undefined ? { starred: patch.starred } : {}),
      ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      ...(patch.trashed !== undefined ? { trashed: patch.trashed } : {}),
    },
  });

  if (patch.read !== undefined) {
    await prisma.adminEmail.updateMany({
      where: { threadId: { in: ids }, direction: 'inbound' },
      data: { read: patch.read },
    });
  }

  if (patch.starred !== undefined) {
    await prisma.adminEmail.updateMany({
      where: { threadId: { in: ids } },
      data: { starred: patch.starred },
    });
  }

  if (patch.trashed !== undefined) {
    await prisma.adminEmail.updateMany({
      where: { threadId: { in: ids } },
      data: { trashed: patch.trashed },
    });
  }

  await Promise.all(ids.map((id) => refreshThreadMeta(id)));
  return ids.length;
}

export async function unreadInboxCount() {
  return prisma.adminEmail.count({
    where: {
      direction: 'inbound',
      read: false,
      trashed: false,
      isDraft: false,
      thread: { archived: false, trashed: false },
    },
  });
}
