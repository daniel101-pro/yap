'use client';

import Spinner from '@/components/ui/Spinner';

export default function PendingBadge({ label = 'Posting…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-exeter/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-exeter">
      <Spinner size={10} />
      {label}
    </span>
  );
}
