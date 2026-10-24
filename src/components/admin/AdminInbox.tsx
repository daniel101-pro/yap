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
}

interface ThreadSummary {
  id: string;
  subject: string;
  snippet: string;
  lastMessageAt: string;
  starred: boolean;
  archived: boolean;
  trashed: boolean;
  unreadCount: number;
  participants: string[];
  fromName: string | null;
  fromEmail: string;
  direction: string;
  isDraft: boolean;
}

interface ThreadMessage {
  id: string;
  direction: string;
  isDraft: boolean;
  fromName: string | null;
  fromEmail: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  textBody: string;
  htmlBody: string;
  snippet: string;
  read: boolean;
  starred: boolean;
  resendStatus: string | null;
  sentByEmail: string | null;
  createdAt: string;
  attachments: { id: string; filename: string; contentType: string; size: number }[];
}

interface ThreadDetail {
  id: string;
  subject: string;
  starred: boolean;
  archived: boolean;
  trashed: boolean;
  messages: ThreadMessage[];
}

interface ListResponse {
  folder: Folder;
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

function formatWhen(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function displayName(name: string | null, email: string) {
  return name || email.split('@')[0] || email;
}

function initials(name: string | null, email: string) {
  const source = name || email;
  return source.slice(0, 1).toUpperCase();
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

function wrapEmailHtml(html: string, text: string) {
  const body =
    html.trim() ||
    `<div style="white-space:pre-wrap">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank" rel="noopener"><style>
    html,body{margin:0;padding:0;background:transparent;color:#1a1a1a;font:15px/1.55 ui-sans-serif,system-ui,sans-serif;word-break:break-word;}
    img,video{max-width:100%;height:auto;}
    a{color:#00796B;}
    @media (prefers-color-scheme: dark){html,body{color:#f5f5f7} a{color:#5eead4}}
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
  const searchTimer = useRef<number | null>(null);
  const listAbort = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<File[]>([]);

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

  useEffect(() => {
    setSelectedId(null);
    setThread(null);
    setChecked(new Set());
    setPage(1);
  }, [folder]);

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

  const latestInbound = [...(thread?.messages ?? [])].reverse().find((m) => m.direction === 'inbound');
  const latestAny = thread?.messages[thread.messages.length - 1];

  const replyTo = (all: boolean) => {
    const source = latestInbound ?? latestAny;
    if (!source || !thread) return;
    const others = [...source.to, ...source.cc].filter((email) => email !== source.fromEmail);
    const quoted = (source.textBody || source.snippet)
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    const who = source.fromName ? `${source.fromName} <${source.fromEmail}>` : source.fromEmail;
    startCompose({
      to: all ? [source.fromEmail, ...others].join(', ') : source.fromEmail,
      cc: all ? source.cc.filter((email) => email !== source.fromEmail).join(', ') : '',
      subject: source.subject.toLowerCase().startsWith('re:') ? source.subject : `Re: ${source.subject}`,
      body: `\n\nOn ${new Date(source.createdAt).toLocaleString('en-GB')}, ${who} wrote:\n${quoted}`,
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
        if (saveDraft) setFolder('drafts');
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

  const syncResend = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      await loadList(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  const counts = list?.counts;
  const threads = list?.threads ?? [];
  const totalPages = Math.max(1, Math.ceil((list?.total ?? 0) / (list?.pageSize ?? 40)));
  const selectedIds = checked.size > 0 ? [...checked] : selectedId ? [selectedId] : [];
  const setupNeeded = list && (!list.config.resendConfigured || !list.config.webhookConfigured);

  const folderLabel = useMemo(() => FOLDERS.find((item) => item.id === folder)?.label ?? 'Inbox', [folder]);

  return (
    <div className="fixed inset-y-0 left-60 right-0 top-14 z-20 flex bg-background text-foreground">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-divider bg-surface/40 p-3 md:flex">
        <button
          type="button"
          onClick={() => startCompose()}
          className="mb-4 flex items-center justify-center gap-2 rounded-full bg-exeter px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(0,121,107,0.28)] transition-opacity hover:opacity-90"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
          Compose
        </button>
        <nav className="space-y-0.5">
          {FOLDERS.map(({ id, label, icon: Icon }) => {
            const count = counts?.[id] ?? 0;
            const unread = id === 'inbox' ? counts?.unread ?? 0 : 0;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setFolder(id)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors ${
                  folder === id ? 'bg-exeter/15 font-semibold text-exeter' : 'text-muted hover:bg-surface hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                <span className="flex-1">{label}</span>
                {(unread || count) > 0 && (
                  <span className={`text-[11px] tabular-nums ${unread ? 'font-bold text-exeter' : ''}`}>
                    {unread || count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        {list?.config.address && (
          <p className="mt-auto px-2 pt-4 text-[11px] leading-relaxed text-muted">
            Sending as <span className="font-medium text-foreground">{list.config.from}</span>
          </p>
        )}
      </aside>

      <section className={`flex min-w-0 flex-col border-r border-divider ${selectedId ? 'hidden md:flex md:w-[380px]' : 'flex-1 md:w-[380px] md:flex-none'}`}>
        <div className="flex items-center gap-2 border-b border-divider px-3 py-2.5">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${folderLabel.toLowerCase()}`}
              className="h-9 w-full rounded-xl bg-surface pl-9 pr-3 text-[13px] outline-none ring-1 ring-transparent placeholder:text-muted focus:ring-exeter/40"
            />
          </div>
          <button type="button" onClick={() => void loadList()} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
          </button>
          <button type="button" onClick={() => void syncResend()} className="hidden rounded-lg px-2 py-1.5 text-[11px] font-medium text-exeter hover:bg-exeter/10 sm:inline">
            Sync
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-divider px-2 py-1.5 md:hidden">
          {FOLDERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFolder(id)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${folder === id ? 'bg-exeter text-white' : 'text-muted'}`}
            >
              {label}
            </button>
          ))}
          <button type="button" onClick={() => startCompose()} className="ml-auto rounded-full bg-exeter px-2.5 py-1 text-[11px] font-semibold text-white">
            New
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-1 border-b border-divider px-2 py-1.5">
            <ToolbarButton label="Archive" icon={Archive} onClick={() => void patchThreads(selectedIds, { archived: true })} />
            <ToolbarButton label="Delete" icon={Trash2} onClick={() => void patchThreads(selectedIds, { trashed: true })} />
            <ToolbarButton label="Read" icon={MailOpen} onClick={() => void patchThreads(selectedIds, { read: true })} />
            <ToolbarButton label="Unread" icon={Mail} onClick={() => void patchThreads(selectedIds, { read: false })} />
            <ToolbarButton label="Star" icon={Star} onClick={() => void patchThreads(selectedIds, { starred: true })} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loadingList && threads.length === 0 && (
            <div className="flex items-center justify-center py-16 text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {!loadingList && threads.length === 0 && (
            <p className="px-6 py-16 text-center text-[13px] text-muted">No messages in {folderLabel.toLowerCase()}.</p>
          )}
          {threads.map((item) => {
            const unread = item.unreadCount > 0;
            const active = selectedId === item.id;
            return (
              <div
                key={item.id}
                className={`flex cursor-pointer items-start gap-2 border-b border-divider/70 px-3 py-3 transition-colors ${
                  active ? 'bg-exeter/10' : unread ? 'bg-background' : 'bg-transparent'
                } hover:bg-surface/70`}
                onClick={() => void openThread(item.id)}
              >
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    setChecked((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    });
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 accent-exeter"
                />
                <button
                  type="button"
                  className="mt-0.5 text-muted hover:text-amber-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    void patchThreads([item.id], { starred: !item.starred });
                  }}
                >
                  <Star className={`h-3.5 w-3.5 ${item.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate text-[13px] ${unread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                      {displayName(item.fromName, item.fromEmail)}
                    </p>
                    <time className="shrink-0 text-[11px] text-muted">{formatWhen(item.lastMessageAt)}</time>
                  </div>
                  <p className={`truncate text-[13px] ${unread ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>{item.subject}</p>
                  <p className="truncate text-[12px] text-muted">{item.snippet || 'No preview'}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-divider px-3 py-2 text-[12px] text-muted">
          <span>
            {list?.total ?? 0} {folderLabel.toLowerCase()}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md p-1 hover:bg-surface disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {page}/{totalPages}
            </span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md p-1 hover:bg-surface disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <article className={`min-w-0 flex-1 flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {!selectedId && (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <Mail className="mb-3 h-10 w-10 text-muted/40" />
            <p className="text-[15px] font-semibold">Select a conversation</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted">
              Send and receive campus mail from {list?.config.address ?? 'your YAP address'}.
            </p>
          </div>
        )}

        {selectedId && (
          <>
            <div className="flex items-center gap-1 border-b border-divider px-3 py-2">
              <button type="button" className="rounded-lg p-2 text-muted hover:bg-surface md:hidden" onClick={() => { setSelectedId(null); setThread(null); }}>
                <ArrowLeft className="h-4 w-4" />
              </button>
              <ToolbarButton label="Archive" icon={Archive} onClick={() => void patchThreads([selectedId], { archived: !thread?.archived })} />
              <ToolbarButton label="Delete" icon={Trash2} onClick={() => void patchThreads([selectedId], { trashed: true })} />
              <ToolbarButton label="Star" icon={Star} onClick={() => void patchThreads([selectedId], { starred: !thread?.starred })} />
              <div className="ml-auto flex items-center gap-1">
                <ToolbarButton label="Reply" icon={Reply} onClick={() => replyTo(false)} />
                <ToolbarButton label="Reply all" icon={ReplyAll} onClick={() => replyTo(true)} />
                <ToolbarButton label="Forward" icon={Send} onClick={forward} />
              </div>
            </div>

            {loadingThread && !thread && (
              <div className="flex flex-1 items-center justify-center text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            )}

            {thread && (
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <h1 className="mb-5 text-[22px] font-bold tracking-tight">{thread.subject}</h1>
                <div className="space-y-6">
                  {thread.messages.filter((message) => !message.isDraft).map((message) => (
                    <MessageCard key={message.id} message={message} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </article>

      {error && (
        <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-[12px] font-medium text-white shadow-lg">
          {error}
          <button type="button" onClick={() => setError('')} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {setupNeeded && (
        <div className="absolute right-4 top-4 z-30 max-w-sm rounded-2xl bg-background/95 p-4 text-[12px] shadow-xl ring-1 ring-divider">
          <p className="font-semibold text-foreground">Finish inbox setup</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted">
            {!list.config.resendConfigured && <li>Set AUTH_RESEND_KEY in the environment.</li>}
            <li>In Resend → Domains, enable Receiving on yap.college (MX records).</li>
            <li>
              Add webhook <code className="text-foreground">https://yap.college/api/webhooks/resend</code> for{' '}
              <code className="text-foreground">email.received</code>.
            </li>
            <li>Put the signing secret in Vercel as RESEND_WEBHOOK_SECRET.</li>
          </ol>
        </div>
      )}

      {composeOpen && (
        <div className="absolute inset-0 z-40 flex items-end justify-end bg-black/20 p-4 md:items-end">
          <div className="flex h-[min(640px,90dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-divider">
            <div className="flex items-center justify-between bg-[#1c1c1e] px-4 py-2.5 text-white">
              <p className="text-[13px] font-semibold">{compose.replyToMessageId ? 'Reply' : 'New message'}</p>
              <button type="button" onClick={() => setComposeOpen(false)} aria-label="Close compose">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="flex items-center gap-3 border-b border-divider px-4">
              <span className="w-10 text-[12px] text-muted">To</span>
              <input
                value={compose.to}
                onChange={(e) => setCompose((c) => ({ ...c, to: e.target.value }))}
                className="h-10 flex-1 bg-transparent text-[13px] outline-none"
                placeholder="name@exeter.ac.uk"
              />
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
            </label>
            {compose.showCc && (
              <label className="flex items-center gap-3 border-b border-divider px-4">
                <span className="w-10 text-[12px] text-muted">Cc</span>
                <input value={compose.cc} onChange={(e) => setCompose((c) => ({ ...c, cc: e.target.value }))} className="h-10 flex-1 bg-transparent text-[13px] outline-none" />
              </label>
            )}
            {compose.showBcc && (
              <label className="flex items-center gap-3 border-b border-divider px-4">
                <span className="w-10 text-[12px] text-muted">Bcc</span>
                <input value={compose.bcc} onChange={(e) => setCompose((c) => ({ ...c, bcc: e.target.value }))} className="h-10 flex-1 bg-transparent text-[13px] outline-none" />
              </label>
            )}
            <label className="flex items-center gap-3 border-b border-divider px-4">
              <span className="w-10 text-[12px] text-muted">Subj</span>
              <input
                value={compose.subject}
                onChange={(e) => setCompose((c) => ({ ...c, subject: e.target.value }))}
                className="h-10 flex-1 bg-transparent text-[13px] outline-none"
              />
            </label>
            <textarea
              value={compose.body}
              onChange={(e) => setCompose((c) => ({ ...c, body: e.target.value }))}
              className="min-h-0 flex-1 resize-none px-4 py-3 text-[14px] outline-none"
              placeholder="Write your email…"
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-divider px-4 py-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendMail(false)}
                className="inline-flex items-center gap-2 rounded-full bg-exeter px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1 text-[12px] text-muted hover:text-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                Attach
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const next = [...files, ...Array.from(event.target.files ?? [])].slice(0, 5);
                    setFiles(next);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
              <button type="button" disabled={busy} onClick={() => void sendMail(true)} className="text-[12px] font-medium text-muted hover:text-foreground">
                Save draft
              </button>
              {files.length > 0 && (
                <p className="text-[11px] text-muted">{files.map((file) => file.name).join(', ')}</p>
              )}
              <button type="button" onClick={() => { setComposeOpen(false); setFiles([]); }} className="ml-auto text-[12px] text-muted hover:text-foreground">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {busy && (
        <div className="pointer-events-none absolute right-6 bottom-6 rounded-full bg-foreground/90 px-3 py-1.5 text-[11px] font-medium text-background">
          Working…
        </div>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Archive;
  onClick: () => void;
}) {
  return (
    <button type="button" title={label} onClick={onClick} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-foreground">
      <Icon className="h-4 w-4" strokeWidth={1.8} />
    </button>
  );
}

function MessageCard({ message }: { message: ThreadMessage }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const html = useMemo(() => wrapEmailHtml(message.htmlBody, message.textBody), [message.htmlBody, message.textBody]);

  return (
    <section className="rounded-2xl ring-1 ring-divider">
      <header className="flex items-start gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-exeter/15 text-[13px] font-bold text-exeter">
          {initials(message.fromName, message.fromEmail)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="truncate text-[14px] font-semibold">
              {displayName(message.fromName, message.fromEmail)}{' '}
              <span className="font-normal text-muted">&lt;{message.fromEmail}&gt;</span>
            </p>
            <time className="text-[11px] text-muted">
              {new Date(message.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </time>
          </div>
          <p className="text-[12px] text-muted">To {message.to.join(', ') || '—'}</p>
          {message.cc.length > 0 && <p className="text-[12px] text-muted">Cc {message.cc.join(', ')}</p>}
          {message.resendStatus && message.direction === 'outbound' && (
            <p className="text-[11px] capitalize text-muted">Status: {message.resendStatus}</p>
          )}
        </div>
      </header>
      <iframe
        ref={iframeRef}
        title={message.subject}
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        srcDoc={html}
        className="w-full border-0 px-2"
        style={{ minHeight: 120 }}
        onLoad={(event) => {
          const doc = event.currentTarget.contentDocument;
          if (!doc) return;
          event.currentTarget.style.height = `${Math.max(120, doc.documentElement.scrollHeight + 8)}px`;
        }}
      />
      {message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-divider px-4 py-3">
          {message.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={`/api/admin/inbox/attachments/${attachment.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-[12px] text-foreground hover:bg-surface-hover"
            >
              <Paperclip className="h-3.5 w-3.5" />
              {attachment.filename}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
