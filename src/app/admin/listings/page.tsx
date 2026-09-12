import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SearchBox from '@/components/admin/SearchBox';
import Pagination from '@/components/admin/Pagination';
import ConfirmButton from '@/components/admin/ConfirmButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable, { AdminTableHead, AdminTableEmpty } from '@/components/admin/AdminTable';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
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
      <AdminPageHeader title="Listings" subtitle={`${total.toLocaleString()} total`}>
        <SearchBox action="/admin/listings" defaultValue={q} placeholder="Search title…" />
      </AdminPageHeader>

      <AdminTable>
        <AdminTableHead>
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
        </AdminTableHead>
        <tbody>
            {listings.map((l, i) => (
              <tr
                key={l.id}
                className="row-in border-t border-divider/60 align-top transition-colors hover:bg-surface/40"
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
                    {l.isSold && <AdminStatusBadge variant="sold" />}
                    {l.hiddenAt ? (
                      <AdminStatusBadge variant="hidden" />
                    ) : (
                      !l.isSold && <AdminStatusBadge variant="live" />
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
            {listings.length === 0 && <AdminTableEmpty colSpan={9} message="No listings found" />}
        </tbody>
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/listings" searchParams={{ q, filter }} />
    </div>
  );
}
