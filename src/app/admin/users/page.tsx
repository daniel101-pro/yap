import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SearchBox from '@/components/admin/SearchBox';
import Pagination from '@/components/admin/Pagination';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">Users</h1>
          <p className="mt-1 text-[13px] text-muted">{total} total</p>
        </div>
        <SearchBox action="/admin/users" defaultValue={q} placeholder="Search email or handle…" />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-divider">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Handle</th>
              <th className="px-4 py-2.5 font-semibold">Email</th>
              <th className="px-4 py-2.5 font-semibold">Karma</th>
              <th className="px-4 py-2.5 font-semibold">Posts</th>
              <th className="px-4 py-2.5 font-semibold">Listings</th>
              <th className="px-4 py-2.5 font-semibold">Joined</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-divider/60">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/users/${u.id}`} className="font-medium text-exeter hover:underline">
                    {u.anonymousHandle ?? 'Anonymous'}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-muted">{u.email}</td>
                <td className="px-4 py-2.5 tabular-nums">{u.karma}</td>
                <td className="px-4 py-2.5 tabular-nums">{u._count.posts}</td>
                <td className="px-4 py-2.5 tabular-nums">{u._count.listings}</td>
                <td className="px-4 py-2.5 text-muted">
                  {u.createdAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-2.5">
                  {u.isBanned ? (
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                      Banned
                    </span>
                  ) : (
                    <span className="rounded-full bg-exeter/10 px-2 py-0.5 text-[11px] font-semibold text-exeter">
                      Active
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {u.isBanned ? (
                    <form action={unbanUserAction} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <button className="text-[12px] font-medium text-exeter hover:underline">Unban</button>
                    </form>
                  ) : (
                    <form action={banUserAction} className="inline">
                      <input type="hidden" name="id" value={u.id} />
                      <ConfirmButton
                        confirmMessage={`Ban ${u.anonymousHandle ?? u.email}? They will be signed out and unable to log back in.`}
                        className="text-[12px] font-medium text-red-500 hover:underline"
                      >
                        Ban
                      </ConfirmButton>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/users" searchParams={{ q, filter }} />
    </div>
  );
}
