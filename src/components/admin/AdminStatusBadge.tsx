type BadgeVariant = 'live' | 'hidden' | 'banned' | 'sold' | 'reserved' | 'neutral';

const STYLES: Record<BadgeVariant, string> = {
  live: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  hidden: 'bg-red-500/12 text-red-500',
  banned: 'bg-red-500/12 text-red-500',
  sold: 'bg-surface-hover text-muted',
  reserved: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  neutral: 'bg-surface-hover text-muted',
};

const LABELS: Record<BadgeVariant, string> = {
  live: 'Live',
  hidden: 'Hidden',
  banned: 'Banned',
  sold: 'Sold',
  reserved: 'Reserved',
  neutral: '—',
};

export default function AdminStatusBadge({
  variant,
  label,
}: {
  variant: BadgeVariant;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[variant]}`}
    >
      {label ?? LABELS[variant]}
    </span>
  );
}
