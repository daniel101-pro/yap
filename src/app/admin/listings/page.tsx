import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SearchBox from '@/components/admin/SearchBox';
import Pagination from '@/components/admin/Pagination';
import ConfirmButton from '@/components/admin/ConfirmButton';
import {
  hideListingAction,
  unhideListingAction,
  deleteListingAction,
  toggleListingSoldAction,
} from '@/lib/admin-actions';

const PAGE_SIZE = 30;

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>;
}) {
  const { q = '', page: pageStr, filter } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const where = {
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(filter === 'hidden' ? { hiddenAt: { not: null } } : {}),
    ...(filter === 'sold' ? { isSold: true } : {}),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        seller: { select: { id: true, anonymousHandle: true } },
        _count: { select: { saves: true } },
      },
    }),
    prisma.listing.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">Listings</h1>
          <p className="mt-1 text-[13px] text-muted">{total} total</p>
        </div>
        <SearchBox action="/admin/listings" defaultValue={q} placeholder="Search title…" />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-divider">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Title</th>
              <th className="px-4 py-2.5 font-semibold">Seller</th>
              <th className="px-4 py-2.5 font-semibold">Price</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Views</th>
              <th className="px-4 py-2.5 font-semibold">Saves</th>
              <th className="px-4 py-2.5 font-semibold">Listed</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l, i) => (
              <tr
                key={l.id}
                className="row-in border-t border-divider/60 align-top"
                style={{ animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}
              >
                <td className="max-w-[220px] px-4 py-2.5">
                  <p className="line-clamp-2 text-foreground">{l.title}</p>
                </td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/users/${l.seller.id}`} className="font-medium text-exeter hover:underline">
                    {l.seller.anonymousHandle ?? 'Anonymous'}
                  </Link>
                </td>
                <td className="px-4 py-2.5 tabular-nums">£{l.price}</td>
                <td className="px-4 py-2.5 text-muted">{l.category}</td>
                <td className="px-4 py-2.5 tabular-nums">{l.views}</td>
                <td className="px-4 py-2.5 tabular-nums">{l._count.saves}</td>
                <td className="px-4 py-2.5 text-muted">{l.createdAt.toLocaleDateString('en-GB')}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-1">
                    {l.isSold && (
                      <span className="w-fit rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-muted">
                        Sold
                      </span>
                    )}
                    {l.hiddenAt ? (
                      <span className="w-fit rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                        Hidden
                      </span>
                    ) : (
                      !l.isSold && (
                        <span className="w-fit rounded-full bg-exeter/10 px-2 py-0.5 text-[11px] font-semibold text-exeter">
                          Live
                        </span>
                      )
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex gap-3">
                      {l.hiddenAt ? (
                        <form action={unhideListingAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className="text-[12px] font-medium text-exeter hover:underline">
                            Unhide
                          </button>
                        </form>
                      ) : (
                        <form action={hideListingAction}>
                          <input type="hidden" name="id" value={l.id} />
                          <button className="text-[12px] font-medium text-foreground hover:underline">
                            Hide
                          </button>
                        </form>
                      )}
                      <form action={deleteListingAction}>
                        <input type="hidden" name="id" value={l.id} />
                        <ConfirmButton
                          confirmMessage="Permanently delete this listing?"
                          className="text-[12px] font-medium text-red-500 hover:underline"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                    <form action={toggleListingSoldAction}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="isSold" value={String(l.isSold)} />
                      <button className="text-[12px] font-medium text-muted hover:underline">
                        Mark {l.isSold ? 'available' : 'sold'}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No listings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/listings" searchParams={{ q, filter }} />
    </div>
  );
}
