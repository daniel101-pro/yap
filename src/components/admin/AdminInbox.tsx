'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Paperclip,
  Pencil,
  RefreshCw,
  Reply,
  ReplyAll,
  Search,
  Send,
  Star,
  Trash2,
  X,
} from 'lucide-react';

type Folder = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archive' | 'trash';

interface InboxConfig {
  address: string;
  from: string;
  resendConfigured: boolean;
  webhookConfigured: boolean;
  canReadInbox?: boolean;
  receiveBlocker?: string | null;
}

interface ThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  lastMessageAt: string;
  starred: boolean;
  unreadCount: number;
  fromName: string | null;
  fromEmail: string;
}

interface ThreadMessage {
  id: string;
  direction: string;
  isDraft: boolean;
  fromName: string | null;
  fromEmail: string;
  to: string[];
  cc: string[];
  subject: string;
  textBody: string;
  htmlBody: string;
  snippet: string;
  resendStatus: string | null;
  createdAt: string;
  attachments: { id: string; filename: string; contentType: string; size: number }[];
}

interface ThreadDetail {
  id: string;
  subject: string;
  starred: boolean;
  archived: boolean;
  messages: ThreadMessage[];
}

interface ListResponse {
  page: number;
  total: number;
  pageSize: number;
  counts: Record<Folder | 'unread', number>;
  config: InboxConfig;
  threads: ThreadSummary[];
}

const FOLDERS: { id: Folder; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'sent', label: 'Sent', icon: Send },
  { id: 'drafts', label: 'Drafts', icon: Pencil },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'trash', label: 'Trash', icon: Trash2 },
];

const SETUP_DISMISS_KEY = 'yap-inbox-setup-dismissed';

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function displayName(name: string | null, email: string) {
  return name || email.split('@')[0] || email;
}

function initials(name: string | null, email: string) {
  return (name || email).slice(0, 1).toUpperCase();
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function splitQuotedText(text: string): { main: string; quoted: string } {
  const lines = text.split('\n');
  const attribution = lines.findIndex((line) => /^\s*On .{0,300}wrote:\s*$/.test(line));
  const firstQuote = lines.findIndex((line) => line.trimStart().startsWith('>'));
  const cut = [attribution, firstQuote].filter((index) => index > 0).sort((a, b) => a - b)[0];
  if (cut === undefined) return { main: text, quoted: '' };
  return { main: lines.slice(0, cut).join('\n').trimEnd(), quoted: lines.slice(cut).join('\n') };
}

function hasQuotedHistory(html: string, text: string) {
  if (html.trim()) return /class="?gmail_quote|<blockquote/i.test(html);
  return Boolean(splitQuotedText(text).quoted);
}

function wrapEmailHtml(html: string, text: string, showQuoted: boolean) {
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const plain = showQuoted ? text : splitQuotedText(text).main;
  const body = html.trim() || `<div style="white-space:pre-wrap">${escape(plain)}</div>`;
  const hideQuotes = showQuoted ? '' : '.gmail_quote,blockquote{display:none!important}';
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank" rel="noopener"><style>
    html,body{margin:0;padding:0;background:transparent;color:#1a1a1a;font:14px/1.6 ui-sans-serif,system-ui,sans-serif;word-break:break-word;}
    img,video{max-width:100%;height:auto;}
    a{color:#00796B;}
    blockquote{margin:0 0 0 .8ex;border-left:1px solid #ccc;padding-left:1ex;color:#5f6368}
    .gmail_attr{color:#5f6368;margin:12px 0 4px}
    ${hideQuotes}
    @media (prefers-color-scheme: dark){html,body{color:#f5f5f7} a{color:#5eead4} blockquote,.gmail_attr{color:#9aa0a6}}
  </style></head><body>${body}</body></html>`;
}

export default function AdminInbox() {
  const [folder, setFolder] = useState<Folder>('inbox');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [list, setList] = useState<ListResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [hideSetup, setHideSetup] = useState(false);
  const [compose, setCompose] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    replyToMessageId: '',
    threadId: '',
    showCc: false,
    showBcc: false,
  });
  const [files, setFiles] = useState<File[]>([]);
  const searchTimer = useRef<number | null>(null);
  const listAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    setHideSetup(window.localStorage.getItem(SETUP_DISMISS_KEY) === '1');
  }, []);

  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 280);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [query]);

  const loadList = useCallback(async (silent = false) => {
    listAbort.current?.abort();
    const controller = new AbortController();
    listAbort.current = controller;
    if (!silent) setLoadingList(true);
    try {
      const params = new URLSearchParams({ folder, page: String(page) });
      if (debouncedQuery) params.set('q', debouncedQuery);
      const res = await fetch(`/api/admin/inbox?${params}`, { cache: 'no-store', signal: controller.signal });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load inbox');
      setList(data as ListResponse);
      setError('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Could not load inbox');
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, [folder, page, debouncedQuery]);

  const loadThread = useCallback(async (id: string) => {
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/admin/inbox/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not open message');
      setThread(data.thread as ThreadDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open message');
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    void loadList(false);
    return () => listAbort.current?.abort();
  }, [loadList]);

  const selectFolder = (next: Folder) => {
    setFolder(next);
    setSelectedId(null);
    setThread(null);
    setChecked(new Set());
    setPage(1);
  };

  const openThread = async (id: string) => {
    setSelectedId(id);
    await loadThread(id);
    void loadList(true);
  };

  const patchThreads = async (ids: string[], patch: Record<string, boolean>) => {
    if (ids.length === 0) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      if (selectedId && ids.includes(selectedId) && (patch.trashed || patch.archived)) {
        setSelectedId(null);
        setThread(null);
      }
      setChecked(new Set());
      await loadList(true);
      if (selectedId && ids.includes(selectedId) && !patch.trashed) await loadThread(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const startCompose = (preset?: Partial<typeof compose>) => {
    setFiles([]);
    setCompose({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      replyToMessageId: '',
      threadId: '',
      showCc: Boolean(preset?.cc),
      showBcc: Boolean(preset?.bcc),
      ...preset,
    });
    setComposeOpen(true);
  };

  const visibleMessages = thread?.messages.filter((message) => !message.isDraft) ?? [];
  const latestInbound = [...visibleMessages].reverse().find((message) => message.direction === 'inbound');
  const latestAny = visibleMessages[visibleMessages.length - 1];

  const replyTo = (all: boolean) => {
    const source = latestInbound ?? latestAny;
    if (!source || !thread) return;
    const others = [...source.to, ...source.cc].filter((email) => email !== source.fromEmail);
    startCompose({
      to: all ? [source.fromEmail, ...others].join(', ') : source.fromEmail,
      cc: all ? source.cc.filter((email) => email !== source.fromEmail).join(', ') : '',
      subject: source.subject.toLowerCase().startsWith('re:') ? source.subject : `Re: ${source.subject}`,
      threadId: thread.id,
      replyToMessageId: source.id,
      showCc: all && source.cc.length > 0,
    });
  };

  const forward = () => {
    const source = latestAny;
    if (!source || !thread) return;
    startCompose({
      subject: source.subject.toLowerCase().startsWith('fwd:') ? source.subject : `Fwd: ${source.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${source.fromEmail}\nDate: ${new Date(source.createdAt).toLocaleString('en-GB')}\nSubject: ${source.subject}\n\n${source.textBody || source.snippet}`,
      threadId: thread.id,
    });
  };

  const sendMail = async (saveDraft = false) => {
    setBusy(true);
    try {
      const attachments = await Promise.all(
        files.slice(0, 5).map(async (file) => ({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          content: await fileToBase64(file),
        })),
      );
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: compose.to,
          cc: compose.cc,
          bcc: compose.bcc,
          subject: compose.subject,
          body: compose.body,
          threadId: compose.threadId || undefined,
          replyToMessageId: compose.replyToMessageId || undefined,
          attachments,
          saveDraft,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send');
      setComposeOpen(false);
      setFiles([]);
      if (data.threadId) {
        if (saveDraft) selectFolder('drafts');
        setSelectedId(data.threadId);
        await loadThread(data.threadId);
      }
      await loadList(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  };

  const counts = list?.counts;
  const threads = list?.threads ?? [];
  const totalPages = Math.max(1, Math.ceil((list?.total ?? 0) / (list?.pageSize ?? 40)));
  const selectedIds = checked.size > 0 ? [...checked] : [];
  const setupNeeded = Boolean(list && !hideSetup && list.config.canReadInbox === false);
  const folderLabel = useMemo(() => FOLDERS.find((item) => item.id === folder)?.label ?? 'Inbox', [folder]);
  const address = list?.config.address ?? 'hello@yap.college';

  return (
    <div className="relative -mx-6 -my-6 flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-background lg:-mx-8">
      {setupNeeded && (
        <div className="flex items-start justify-between gap-3 border-b border-amber-500/20 bg-amber-50 px-4 py-2.5 text-[12px] text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
          <p>This server’s Resend key cannot read inbound mail. Set a Full access AUTH_RESEND_KEY on Vercel.</p>
          <button
            type="button"
            className="shrink-0 rounded-md p-1 hover:bg-amber-500/10"
            onClick={() => {
              window.localStorage.setItem(SETUP_DISMISS_KEY, '1');
              setHideSetup(true);
            }}
            aria-label="Dismiss setup note"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 border-b border-divider px-3 py-2">
        <button
          type="button"
          onClick={() => startCompose()}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-exeter px-4 text-[13px] font-semibold text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Compose
        </button>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${folderLabel.toLowerCase()}`}
            className="h-9 w-full rounded-full bg-surface pl-9 pr-3 text-[13px] outline-none ring-1 ring-divider placeholder:text-muted focus:ring-exeter/40"
          />
        </div>
        <button type="button" onClick={() => void loadList()} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-surface" aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-divider px-2">
        {FOLDERS.map(({ id, label }) => {
          const unread = id === 'inbox' ? counts?.unread ?? 0 : 0;
          const active = folder === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectFolder(id)}
              className={`relative shrink-0 px-3 py-2.5 text-[13px] ${
                active ? 'font-semibold text-exeter' : 'text-muted hover:text-foreground'
              }`}
            >
              {label}
              {unread > 0 && <span className="ml-1 text-[11px] tabular-nums">{unread}</span>}
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-exeter" />}
            </button>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1">
        <section className={`flex min-w-0 flex-col border-r border-divider ${selectedId ? 'hidden md:flex md:w-[46%] lg:w-[420px]' : 'flex-1'}`}>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-1 border-b border-divider px-2 py-1.5">
              <ActionButton label="Archive" icon={Archive} onClick={() => void patchThreads(selectedIds, { archived: true })} />
              <ActionButton label="Delete" icon={Trash2} onClick={() => void patchThreads(selectedIds, { trashed: true })} />
              <ActionButton label="Read" icon={MailOpen} onClick={() => void patchThreads(selectedIds, { read: true })} />
              <ActionButton label="Unread" icon={Mail} onClick={() => void patchThreads(selectedIds, { read: false })} />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList && threads.length === 0 && (
              <div className="flex justify-center py-20 text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}
            {!loadingList && threads.length === 0 && (
              <div className="px-6 py-20 text-center">
                <p className="text-[14px] font-semibold">No conversations</p>
                <p className="mt-1 text-[13px] text-muted">Nothing in {folderLabel.toLowerCase()}.</p>
              </div>
            )}
            {threads.map((item) => {
              const unread = item.unreadCount > 0;
              const active = selectedId === item.id;
              return (
                <div
                  key={item.id}
                  className={`grid cursor-pointer grid-cols-[20px_20px_minmax(0,1fr)_auto] items-center gap-2 border-b border-divider/70 px-3 py-2.5 ${
                    active ? 'bg-exeter/10' : unread ? 'bg-exeter/[0.04]' : 'hover:bg-surface/80'
                  }`}
                  onClick={() => void openThread(item.id)}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(item.id)}
                    className="accent-exeter"
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => {
                      setChecked((prev) => {
                        const next = new Set(prev);
                        if (event.target.checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      });
                    }}
                  />
                  <button
                    type="button"
                    className="text-muted hover:text-amber-500"
                    onClick={(event) => {
                      event.stopPropagation();
                      void patchThreads([item.id], { starred: !item.starred });
                    }}
                    aria-label={item.starred ? 'Unstar' : 'Star'}
                  >
                    <Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                  <div className="min-w-0">
                    <p className={`truncate text-[13px] ${unread ? 'font-bold' : 'font-medium'}`}>
                      {displayName(item.fromName, item.fromEmail)}
                    </p>
                    <p className="truncate text-[13px]">
                      <span className={unread ? 'font-semibold' : ''}>{item.subject || '(no subject)'}</span>
                      <span className="text-muted"> — {item.snippet || 'No preview'}</span>
                    </p>
                  </div>
                  <time className={`shrink-0 text-[11px] ${unread ? 'font-semibold text-foreground' : 'text-muted'}`}>
                    {formatWhen(item.lastMessageAt)}
                  </time>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-divider px-3 py-1.5 text-[11px] text-muted">
            <span>{list?.total ?? 0}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded p-1 hover:bg-surface disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                {page}/{totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded p-1 hover:bg-surface disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <article className={`min-w-0 flex-1 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
          {!selectedId && (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center text-muted">
              <Inbox className="mb-3 h-10 w-10 opacity-30" />
              <p className="text-[15px] font-medium text-foreground">Select a conversation</p>
              <p className="mt-1 text-[13px]">{address}</p>
            </div>
          )}

          {selectedId && (
            <>
              <div className="flex items-center gap-1 border-b border-divider px-3 py-1.5">
                <button
                  type="button"
                  className="rounded-lg p-2 text-muted hover:bg-surface md:hidden"
                  onClick={() => {
                    setSelectedId(null);
                    setThread(null);
                  }}
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <ActionButton label="Archive" icon={Archive} onClick={() => void patchThreads([selectedId], { archived: !thread?.archived })} />
                <ActionButton label="Delete" icon={Trash2} onClick={() => void patchThreads([selectedId], { trashed: true })} />
                <ActionButton label="Star" icon={Star} onClick={() => void patchThreads([selectedId], { starred: !thread?.starred })} />
                <div className="ml-auto flex items-center gap-1">
                  <ActionButton label="Reply" icon={Reply} onClick={() => replyTo(false)} />
                  <ActionButton label="Reply all" icon={ReplyAll} onClick={() => replyTo(true)} />
                  <ActionButton label="Forward" icon={Send} onClick={forward} />
                </div>
              </div>

              {loadingThread && !thread && (
                <div className="flex flex-1 items-center justify-center text-muted">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}

              {thread && (
                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  <h2 className="mb-6 text-[22px] font-normal tracking-tight">{thread.subject || '(no subject)'}</h2>
                  <div className="space-y-8">
                    {visibleMessages.map((message) => (
                      <MessageCard key={message.id} message={message} />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => replyTo(false)}
                    className="mt-8 inline-flex items-center gap-2 rounded-full border border-divider px-4 py-2 text-[13px] hover:bg-surface"
                  >
                    <Reply className="h-4 w-4" />
                    Reply
                  </button>
                </div>
              )}
            </>
          )}
        </article>
      </div>

      {error && (
        <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {composeOpen && (
        <div className="absolute bottom-0 right-3 z-40 flex h-[min(560px,80dvh)] w-[min(520px,calc(100%-1.5rem))] flex-col overflow-hidden rounded-t-2xl bg-background shadow-[0_-8px_40px_rgba(0,0,0,0.18)] ring-1 ring-divider">
          <div className="flex items-center justify-between bg-[#404040] px-4 py-2 text-white">
            <p className="text-[13px] font-medium">{compose.replyToMessageId ? 'Reply' : 'New message'}</p>
            <button type="button" onClick={() => setComposeOpen(false)} className="rounded p-1 hover:bg-white/10" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ComposeField label="To" value={compose.to} onChange={(to) => setCompose((c) => ({ ...c, to }))} placeholder="Recipients">
            {!compose.showCc && (
              <button type="button" className="text-[12px] text-muted" onClick={() => setCompose((c) => ({ ...c, showCc: true }))}>
                Cc
              </button>
            )}
            {!compose.showBcc && (
              <button type="button" className="text-[12px] text-muted" onClick={() => setCompose((c) => ({ ...c, showBcc: true }))}>
                Bcc
              </button>
            )}
          </ComposeField>
          {compose.showCc && <ComposeField label="Cc" value={compose.cc} onChange={(cc) => setCompose((c) => ({ ...c, cc }))} />}
          {compose.showBcc && <ComposeField label="Bcc" value={compose.bcc} onChange={(bcc) => setCompose((c) => ({ ...c, bcc }))} />}
          <ComposeField label="Subject" value={compose.subject} onChange={(subject) => setCompose((c) => ({ ...c, subject }))} />
          <textarea
            value={compose.body}
            onChange={(event) => setCompose((c) => ({ ...c, body: event.target.value }))}
            className="min-h-0 flex-1 resize-none px-4 py-3 text-[14px] leading-6 outline-none"
            placeholder="Write your message"
            autoFocus
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-divider px-4 py-2">
              {files.map((file) => (
                <span key={file.name} className="rounded bg-surface px-2 py-1 text-[12px] text-muted">
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 border-t border-divider px-4 py-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => void sendMail(false)}
              className="inline-flex items-center gap-2 rounded-full bg-exeter px-4 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send
            </button>
            <label className="cursor-pointer rounded-full p-2 text-muted hover:bg-surface">
              <Paperclip className="h-4 w-4" />
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => {
                  setFiles((current) => [...current, ...Array.from(event.target.files ?? [])].slice(0, 5));
                  event.currentTarget.value = '';
                }}
              />
            </label>
            <button type="button" disabled={busy} onClick={() => void sendMail(true)} className="text-[12px] text-muted hover:text-foreground">
              Draft
            </button>
            <button
              type="button"
              onClick={() => {
                setComposeOpen(false);
                setFiles([]);
              }}
              className="ml-auto text-[12px] text-muted hover:text-foreground"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Archive;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-muted hover:bg-surface hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ComposeField({
  label,
  value,
  onChange,
  placeholder,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 border-b border-divider px-5">
      <span className="w-14 text-[12px] text-muted">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-11 flex-1 bg-transparent text-[13px] outline-none"
      />
      {children}
    </label>
  );
}

function MessageCard({ message }: { message: ThreadMessage }) {
  const [showQuoted, setShowQuoted] = useState(false);
  const html = useMemo(
    () => wrapEmailHtml(message.htmlBody, message.textBody, showQuoted),
    [message.htmlBody, message.textBody, showQuoted],
  );
  const quoted = useMemo(() => hasQuotedHistory(message.htmlBody, message.textBody), [message.htmlBody, message.textBody]);
  const name = displayName(message.fromName, message.fromEmail);

  return (
    <section>
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#c2e7ff] text-[13px] font-semibold text-[#041e49] dark:bg-exeter/20 dark:text-exeter">
          {initials(message.fromName, message.fromEmail)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold leading-tight">{name}</p>
              <p className="mt-0.5 truncate text-[12px] text-muted">{message.fromEmail}</p>
              <p className="truncate text-[12px] text-muted">to {message.to.join(', ') || 'me'}</p>
            </div>
            <time className="shrink-0 pt-0.5 text-[12px] text-muted">
              {new Date(message.createdAt).toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
        </div>
      </header>
      <div className="pl-[52px]">
        <iframe
          title={message.subject}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
          srcDoc={html}
          className="mt-3 w-full border-0"
          style={{ minHeight: 40 }}
          onLoad={(event) => {
            const doc = event.currentTarget.contentDocument;
            if (!doc) return;
            event.currentTarget.style.height = `${Math.max(40, doc.documentElement.scrollHeight + 4)}px`;
          }}
        />
        {quoted && (
          <button
            type="button"
            onClick={() => setShowQuoted((value) => !value)}
            title={showQuoted ? 'Hide quoted text' : 'Show trimmed content'}
            className="mt-1 rounded-md bg-surface px-2 text-[13px] font-bold leading-4 text-muted hover:bg-surface-hover"
          >
            •••
          </button>
        )}
        {message.attachments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/admin/inbox/attachments/${attachment.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[12px] hover:bg-surface-hover"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {attachment.filename}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
