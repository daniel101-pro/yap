import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SearchBox from '@/components/admin/SearchBox';
import Pagination from '@/components/admin/Pagination';
import ConfirmButton from '@/components/admin/ConfirmButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable, { AdminTableHead, AdminTableEmpty } from '@/components/admin/AdminTable';
import AdminStatusBadge from '@/components/admin/AdminStatusBadge';
import { hideCommentAction, unhideCommentAction, deleteCommentAction } from '@/lib/admin-actions';

const PAGE_SIZE = 30;

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>;
}) {
  const { q = '', page: pageStr, filter } = await searchParams;
  const page = Math.max(1, Number(pageStr) || 1);

  const where = {
    ...(q ? { content: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(filter === 'hidden' ? { hiddenAt: { not: null } } : {}),
  };

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { id: true, anonymousHandle: true } },
        post: { select: { id: true, content: true } },
      },
    }),
    prisma.comment.count({ where }),
  ]);

  const reportCounts = await prisma.report.groupBy({
    by: ['targetId'],
    where: { targetType: 'comment', targetId: { in: comments.map((c) => c.id) } },
    _count: { id: true },
  });
  const reportMap = new Map(reportCounts.map((r) => [r.targetId, r._count.id]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <AdminPageHeader title="Comments" subtitle={`${total.toLocaleString()} total`}>
        <SearchBox action="/admin/comments" defaultValue={q} placeholder="Search comment content…" />
      </AdminPageHeader>

      <AdminTable>
        <AdminTableHead>
            <tr>
              <th className="px-4 py-2.5 font-semibold">Comment</th>
              <th className="px-4 py-2.5 font-semibold">On post</th>
              <th className="px-4 py-2.5 font-semibold">Author</th>
              <th className="px-4 py-2.5 font-semibold">Upvotes</th>
              <th className="px-4 py-2.5 font-semibold">Reports</th>
              <th className="px-4 py-2.5 font-semibold">Posted</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
        </AdminTableHead>
        <tbody>
            {comments.map((c, i) => {
              const reportCount = reportMap.get(c.id) ?? 0;
              return (
                <tr
                  key={c.id}
                  className="row-in border-t border-divider/60 align-top transition-colors hover:bg-surface/40"
                  style={{ animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}
                >
                  <td className="max-w-[240px] px-4 py-2.5">
                    <p className="line-clamp-2 text-foreground">{c.content}</p>
                  </td>
                  <td className="max-w-[180px] px-4 py-2.5">
                    <Link
                      href={`/admin/posts?q=${encodeURIComponent(c.post.content.slice(0, 40))}`}
                      className="line-clamp-1 text-exeter hover:underline"
                    >
                      {c.post.content || '(media/poll post)'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/users/${c.author.id}`} className="font-medium text-exeter hover:underline">
                      {c.author.anonymousHandle ?? 'Anonymous'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{c.upvotes}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {reportCount > 0 ? (
                      <span className="font-semibold text-red-500">{reportCount}</span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{c.createdAt.toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-2.5">
                    {c.hiddenAt ? <AdminStatusBadge variant="hidden" /> : <AdminStatusBadge variant="live" />}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3">
                      {c.hiddenAt ? (
                        <form action={unhideCommentAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="text-[12px] font-medium text-exeter hover:underline">
                            Unhide
                          </button>
                        </form>
                      ) : (
                        <form action={hideCommentAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button className="text-[12px] font-medium text-foreground hover:underline">
                            Hide
                          </button>
                        </form>
                      )}
                      <form action={deleteCommentAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <ConfirmButton
                          confirmMessage="Permanently delete this comment?"
                          className="text-[12px] font-medium text-red-500 hover:underline"
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {comments.length === 0 && <AdminTableEmpty colSpan={8} message="No comments found" />}
        </tbody>
      </AdminTable>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/comments" searchParams={{ q, filter }} />
    </div>
  );
}
