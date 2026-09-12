import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SearchBox from '@/components/admin/SearchBox';
import Pagination from '@/components/admin/Pagination';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable, { AdminTableHead, AdminTableEmpty } from '@/components/admin/AdminTable';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import { banUserAction, unbanUserAction } from '@/lib/admin-actions';
import ConfirmButton from '@/components/admin/ConfirmButton';

const PAGE_SIZE = 30;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>;
}) {
  const { q = '', page: pageStr, filter } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const where = {
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' as const } },
            { anonymousHandle: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(filter === 'banned' ? { isBanned: true } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { posts: true, listings: true, comments: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader
        title="Users"
        subtitle={`${total.toLocaleString()} registered · ${filter === 'banned' ? 'banned only' : 'all users'}`}
      >
        <SearchBox action="/admin/users" defaultValue={q} placeholder="Search email or handle…" />
      </AdminPageHeader>

      <AdminTable>
        <AdminTableHead>
          <tr>
            <th className="px-4 py-3 font-semibold">Handle</th>
            <th className="px-4 py-3 font-semibold">Email</th>
            <th className="px-4 py-3 font-semibold">Karma</th>
            <th className="px-4 py-3 font-semibold">Posts</th>
            <th className="px-4 py-3 font-semibold">Listings</th>
            <th className="px-4 py-3 font-semibold">Joined</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </AdminTableHead>
        <tbody>
          {users.map((u, i) => (
            <tr
              key={u.id}
              className="row-in border-t border-divider/60 transition-colors hover:bg-surface/40"
              style={{ animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}
            >
              <td className="px-4 py-3">
                <Link href={`/admin/users/${u.id}`} className="font-semibold text-exeter hover:underline">
                  {u.anonymousHandle ?? 'Anonymous'}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted">{u.email}</td>
              <td className="px-4 py-3 tabular-nums font-medium">{u.karma}</td>
              <td className="px-4 py-3 tabular-nums">{u._count.posts}</td>
              <td className="px-4 py-3 tabular-nums">{u._count.listings}</td>
              <td className="px-4 py-3 text-muted">
                {u.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                {u.isBanned ? <AdminStatusBadge variant="banned" /> : <AdminStatusBadge variant="live" />}
              </td>
              <td className="px-4 py-3 text-right">
                {u.isBanned ? (
                  <form action={unbanUserAction} className="inline">
                    <input type="hidden" name="id" value={u.id} />
                    <button className="text-[12px] font-semibold text-exeter hover:underline">Unban</button>
                  </form>
                ) : (
                  <form action={banUserAction} className="inline">
                    <input type="hidden" name="id" value={u.id} />
                    <ConfirmButton
                      confirmMessage={`Ban ${u.anonymousHandle ?? u.email}? They will be signed out and unable to log back in.`}
                      className="text-[12px] font-semibold text-red-500 hover:underline"
                    >
                      Ban
                    </ConfirmButton>
                  </form>
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && <AdminTableEmpty colSpan={8} message="No users found" />}
        </tbody>
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/users" searchParams={{ q, filter }} />
    </div>
  );
}
