import Link from 'next/link';

export default function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams ?? {})) {
      if (v) params.set(k, v);
    }
    params.set('page', String(p));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between px-1 py-3 text-[12px] text-muted">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          href={buildHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={`rounded-lg px-3 py-1.5 font-medium ring-1 ring-divider ${
            page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-surface'
          }`}
        >
          Previous
        </Link>
        <Link
          href={buildHref(Math.min(totalPages, page + 1))}
          aria-disabled={page >= totalPages}
          className={`rounded-lg px-3 py-1.5 font-medium ring-1 ring-divider ${
            page >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-surface'
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
