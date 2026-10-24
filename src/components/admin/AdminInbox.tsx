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

function wrapEmailHtml(html: string, text: string) {
  const body =
    html.trim() ||
    `<div style="white-space:pre-wrap">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank" rel="noopener"><style>
    html,body{margin:0;padding:12px 4px;background:transparent;color:#1a1a1a;font:15px/1.6 ui-sans-serif,system-ui,sans-serif;word-break:break-word;}
    img,video{max-width:100%;height:auto;}
    a{color:#00796B;}
    @media (prefers-color-scheme: dark){html,body{color:#f5f5f7} a{color:#5eead4}}
  </style></head><body>${body}</body></html>`;
}

function quotedReply(message: ThreadMessage) {
  const who = message.fromName ? `${message.fromName} <${message.fromEmail}>` : message.fromEmail;
  const quoted = (message.textBody || message.snippet)
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
  return `\n\nOn ${new Date(message.createdAt).toLocaleString('en-GB')}, ${who} wrote:\n${quoted}`;
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
      body: quotedReply(source),
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
  const setupNeeded = Boolean(
    list &&
      !hideSetup &&
      (!list.config.resendConfigured || !list.config.webhookConfigured || list.config.canReadInbox === false),
  );
  const folderLabel = useMemo(() => FOLDERS.find((item) => item.id === folder)?.label ?? 'Inbox', [folder]);
  const address = list?.config.address ?? 'hello@yap.college';

  return (
    <div className="relative -mx-6 -my-6 flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col bg-background lg:-mx-8">
      {setupNeeded && (
        <div className="flex items-start justify-between gap-3 border-b border-amber-500/20 bg-amber-50 px-5 py-3 text-[12px] text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
          <p>
            {list.config.receiveBlocker === 'restricted_api_key' ? (
              <>
                Sending works from <span className="font-semibold">{address}</span>, but the Resend API key is{' '}
                <span className="font-semibold">send-only</span>. Create a <span className="font-semibold">Full access</span> key
                and replace <span className="font-mono">AUTH_RESEND_KEY</span>. yap.college also has no MX records, so inbound
                mail cannot be delivered until Receiving is enabled in Resend and that MX is added.
              </>
            ) : (
              <>
                Sending works from <span className="font-semibold">{address}</span>. Receiving still needs Resend inbound MX
                and a full-access API key.
              </>
            )}
          </p>
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

      <header className="flex flex-wrap items-center gap-3 border-b border-divider px-5 py-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-bold tracking-tight">Mail</h1>
          <p className="truncate text-[12px] text-muted">{list?.config.from ?? address}</p>
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${folderLabel.toLowerCase()}`}
            className="h-10 w-full rounded-xl bg-surface pl-10 pr-3 text-[13px] outline-none ring-1 ring-divider placeholder:text-muted focus:ring-exeter/40"
          />
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-muted ring-1 ring-divider hover:bg-surface hover:text-foreground"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => startCompose()}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-exeter px-4 text-[13px] font-semibold text-white hover:opacity-90"
        >
          <Pencil className="h-4 w-4" strokeWidth={2} />
          Compose
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-48 shrink-0 flex-col border-r border-divider p-3 lg:flex">
          <nav className="space-y-1">
            {FOLDERS.map(({ id, label, icon: Icon }) => {
              const unread = id === 'inbox' ? counts?.unread ?? 0 : 0;
              const count = unread || counts?.[id] || 0;
              const active = folder === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectFolder(id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] ${
                    active ? 'bg-exeter/12 font-semibold text-exeter' : 'text-muted hover:bg-surface hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span className="flex-1">{label}</span>
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-exeter/15' : 'bg-surface'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className={`flex min-w-0 flex-col border-r border-divider ${selectedId ? 'hidden md:flex md:w-[360px] lg:w-[400px]' : 'flex-1 md:max-w-[400px]'}`}>
          <div className="flex gap-1 overflow-x-auto border-b border-divider px-3 py-2 lg:hidden">
            {FOLDERS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => selectFolder(id)}
                className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${folder === id ? 'bg-exeter text-white' : 'bg-surface text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-divider px-3 py-2">
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
                <Mail className="mx-auto mb-3 h-8 w-8 text-muted/40" />
                <p className="text-[14px] font-semibold">No messages</p>
                <p className="mt-1 text-[13px] text-muted">Nothing in {folderLabel.toLowerCase()} yet.</p>
              </div>
            )}
            {threads.map((item) => {
              const unread = item.unreadCount > 0;
              const active = selectedId === item.id;
              return (
                <div
                  key={item.id}
                  className={`flex cursor-pointer gap-3 border-b border-divider/80 px-4 py-3.5 ${
                    active ? 'bg-exeter/10' : unread ? 'bg-exeter/[0.03]' : 'hover:bg-surface/70'
                  }`}
                  onClick={() => void openThread(item.id)}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(item.id)}
                    className="mt-2 accent-exeter"
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
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${unread ? 'bg-exeter text-white' : 'bg-surface text-muted'}`}>
                    {initials(item.fromName, item.fromEmail)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`min-w-0 truncate text-[13px] ${unread ? 'font-bold' : 'font-medium'}`}>
                        {displayName(item.fromName, item.fromEmail)}
                      </p>
                      <time className="ml-auto shrink-0 text-[11px] text-muted">{formatWhen(item.lastMessageAt)}</time>
                    </div>
                    <p className={`truncate text-[13px] ${unread ? 'font-semibold' : 'text-foreground/80'}`}>{item.subject}</p>
                    <p className="truncate text-[12px] text-muted">{item.snippet || 'No preview'}</p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 text-muted hover:text-amber-500"
                    onClick={(event) => {
                      event.stopPropagation();
                      void patchThreads([item.id], { starred: !item.starred });
                    }}
                    aria-label={item.starred ? 'Unstar' : 'Star'}
                  >
                    <Star className={`h-4 w-4 ${item.starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-divider px-4 py-2 text-[12px] text-muted">
            <span>{list?.total ?? 0} conversations</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md p-1 hover:bg-surface disabled:opacity-30">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md p-1 hover:bg-surface disabled:opacity-30">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        <article className={`min-w-0 flex-1 flex-col bg-surface/30 ${selectedId ? 'flex' : 'hidden md:flex'}`}>
          {!selectedId && (
            <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-exeter/10 text-exeter">
                <Inbox className="h-6 w-6" />
              </div>
              <p className="text-[16px] font-semibold">Select a conversation</p>
              <p className="mt-1 max-w-sm text-[13px] text-muted">
                Campus mail for {address}. Compose a new message or open a thread from the list.
              </p>
              <button
                type="button"
                onClick={() => startCompose()}
                className="mt-5 rounded-xl bg-exeter px-4 py-2 text-[13px] font-semibold text-white"
              >
                New message
              </button>
            </div>
          )}

          {selectedId && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-divider bg-background px-4 py-2.5">
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
                <div className="ml-auto flex items-center gap-2">
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
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-8">
                  <h2 className="mb-5 text-[22px] font-bold tracking-tight">{thread.subject}</h2>
                  <div className="space-y-4">
                    {visibleMessages.map((message) => (
                      <MessageCard key={message.id} message={message} />
                    ))}
                  </div>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => replyTo(false)}
                      className="inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2 text-[13px] font-medium ring-1 ring-divider hover:bg-surface"
                    >
                      <Reply className="h-4 w-4" />
                      Reply
                    </button>
                  </div>
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
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
          <div className="flex h-[min(680px,92dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-background shadow-2xl ring-1 ring-divider">
            <div className="flex items-center justify-between border-b border-divider px-5 py-3.5">
              <div>
                <p className="text-[15px] font-semibold">{compose.replyToMessageId ? 'Reply' : 'New message'}</p>
                <p className="text-[12px] text-muted">From {list?.config.from ?? address}</p>
              </div>
              <button type="button" onClick={() => setComposeOpen(false)} className="rounded-lg p-2 text-muted hover:bg-surface" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ComposeField label="To" value={compose.to} onChange={(to) => setCompose((c) => ({ ...c, to }))} placeholder="name@exeter.ac.uk">
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
            {compose.showCc && (
              <ComposeField label="Cc" value={compose.cc} onChange={(cc) => setCompose((c) => ({ ...c, cc }))} />
            )}
            {compose.showBcc && (
              <ComposeField label="Bcc" value={compose.bcc} onChange={(bcc) => setCompose((c) => ({ ...c, bcc }))} />
            )}
            <ComposeField label="Subject" value={compose.subject} onChange={(subject) => setCompose((c) => ({ ...c, subject }))} />
            <textarea
              value={compose.body}
              onChange={(event) => setCompose((c) => ({ ...c, body: event.target.value }))}
              className="min-h-0 flex-1 resize-none px-5 py-4 text-[14px] leading-6 outline-none"
              placeholder="Write your email…"
              autoFocus
            />
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 border-t border-divider px-5 py-2">
                {files.map((file) => (
                  <span key={file.name} className="rounded-lg bg-surface px-2.5 py-1 text-[12px] text-muted">
                    {file.name}
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-divider px-5 py-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void sendMail(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-exeter px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </button>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] text-muted hover:bg-surface">
                <Paperclip className="h-3.5 w-3.5" />
                Attach
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
              <button type="button" disabled={busy} onClick={() => void sendMail(true)} className="text-[12px] font-medium text-muted hover:text-foreground">
                Save draft
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
  const html = useMemo(
    () => wrapEmailHtml(message.htmlBody, message.textBody),
    [message.htmlBody, message.textBody],
  );

  return (
    <section className="overflow-hidden rounded-2xl bg-background shadow-[0_1px_3px_rgba(0,0,0,0.04)] ring-1 ring-divider">
      <header className="flex items-start gap-3 px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-exeter/12 text-[13px] font-bold text-exeter">
          {initials(message.fromName, message.fromEmail)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="truncate text-[14px] font-semibold">
              {displayName(message.fromName, message.fromEmail)}
              <span className="ml-1.5 font-normal text-muted">{message.fromEmail}</span>
            </p>
            <time className="text-[11px] text-muted">
              {new Date(message.createdAt).toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </div>
          <p className="text-[12px] text-muted">To {message.to.join(', ') || '—'}</p>
          {message.cc.length > 0 && <p className="text-[12px] text-muted">Cc {message.cc.join(', ')}</p>}
          {message.resendStatus && message.direction === 'outbound' && (
            <p className="text-[11px] capitalize text-muted">Sent · {message.resendStatus}</p>
          )}
        </div>
      </header>
      <iframe
        title={message.subject}
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        srcDoc={html}
        className="w-full border-0"
        style={{ minHeight: 140 }}
        onLoad={(event) => {
          const doc = event.currentTarget.contentDocument;
          if (!doc) return;
          event.currentTarget.style.height = `${Math.max(140, doc.documentElement.scrollHeight + 16)}px`;
        }}
      />
      {message.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-divider px-5 py-3">
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
    </section>
  );
}
