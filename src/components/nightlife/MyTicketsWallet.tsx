'use client';

import { useEffect, useState } from 'react';
import { Calendar, Download, Loader2, Ticket } from 'lucide-react';
import type { NightlifePurchase } from '@/types';
import { formatEventDate, formatEventTime } from '@/lib/utils';
import { useStore } from '@/lib/store';

function parsePurchases(raw: NightlifePurchase[]): NightlifePurchase[] {
  return raw.map((t) => ({
    ...t,
    eventDate: new Date(t.eventDate),
    ...(t.eventEndDate ? { eventEndDate: new Date(t.eventEndDate) } : {}),
    soldAt: new Date(t.soldAt),
  }));
}

export default function MyTicketsWallet() {
  const purchases = useStore((s) => s.nightlifePurchases);
  const [live, setLive] = useState<NightlifePurchase[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/nightlife/purchases', {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.purchases)) return;
        setLive(parsePurchases(data.purchases as NightlifePurchase[]));
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
      });
    return () => controller.abort();
  }, []);

  const tickets = live ?? purchases;

  if (tickets.length === 0) {
    return (
      <div className="rounded-2xl bg-surface px-5 py-10 text-center ring-1 ring-divider">
        <Ticket className="mx-auto mb-3 h-8 w-8 text-muted" strokeWidth={1.5} />
        <p className="text-[15px] font-semibold text-foreground">No tickets yet</p>
        <p className="mt-1 text-[13px] text-muted">
          Buy a resale listing and it lands here so you can download it.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <PurchaseTicketCard ticket={ticket} />
        </li>
      ))}
    </ul>
  );
}

function PurchaseTicketCard({ ticket }: { ticket: NightlifePurchase }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!ticket.hasProof || ticket.proofIsPdf) return;
    let blobUrl: string | null = null;
    fetch(`/api/nightlife/tickets/${encodeURIComponent(ticket.id)}/proof-image`, {
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('preview failed');
        const blob = await res.blob();
        if (blob.type.includes('pdf')) {
          setPreviewFailed(true);
          return;
        }
        blobUrl = URL.createObjectURL(blob);
        setPreviewUrl(blobUrl);
      })
      .catch(() => setPreviewFailed(true));
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [ticket.hasProof, ticket.id, ticket.proofIsPdf]);

  return (
    <article className="overflow-hidden rounded-2xl bg-surface ring-1 ring-divider">
      {ticket.hasProof && !ticket.proofIsPdf && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-36 w-full bg-black/5 object-cover" />
      ) : ticket.hasProof && ticket.proofIsPdf ? (
        <div className="flex h-28 items-center justify-center bg-exeter/10 text-exeter">
          <Ticket className="h-8 w-8" strokeWidth={1.5} />
        </div>
      ) : ticket.hasProof && !previewFailed ? (
        <div className="flex h-28 items-center justify-center bg-surface-hover">
          <Loader2 className="h-6 w-6 animate-spin text-muted" />
        </div>
      ) : null}

      <div className="p-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-exeter">{ticket.venue}</p>
        <h3 className="mt-1 text-[16px] font-bold leading-snug text-foreground">{ticket.title}</h3>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted">
          <Calendar className="h-3.5 w-3.5" strokeWidth={2} />
          {formatEventDate(ticket.eventDate)} · {formatEventTime(ticket.eventDate)}
        </p>
        {ticket.hasProof ? (
          <a
            href={`/api/nightlife/tickets/${encodeURIComponent(ticket.id)}/download`}
            className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-exeter py-3 text-[13px] font-bold text-white"
          >
            <Download className="h-4 w-4" strokeWidth={2.5} />
            Download ticket
          </a>
        ) : (
          <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-center text-[12px] text-amber-700 dark:text-amber-300">
            File still uploading — try again in a minute.
          </p>
        )}
      </div>
    </article>
  );
}
