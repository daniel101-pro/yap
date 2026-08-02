import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import SearchBox from '@/components/admin/SearchBox';
import Pagination from '@/components/admin/Pagination';
import ConfirmButton from '@/components/admin/ConfirmButton';
import { hidePostAction, unhidePostAction, deletePostAction } from '@/lib/admin-actions';

const PAGE_SIZE = 30;

export default async function AdminPostsPage({
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

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { id: true, anonymousHandle: true, email: true } },
        reactions: true,
        _count: { select: { comments: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const reportCounts = await prisma.report.groupBy({
    by: ['targetId'],
    where: { targetType: 'post', targetId: { in: posts.map((p) => p.id) } },
    _count: { id: true },
  });
  const reportMap = new Map(reportCounts.map((r) => [r.targetId, r._count.id]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">Posts</h1>
          <p className="mt-1 text-[13px] text-muted">{total} total</p>
        </div>
        <SearchBox action="/admin/posts" defaultValue={q} placeholder="Search post content…" />
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-divider">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-surface/70 text-[11px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Content</th>
              <th className="px-4 py-2.5 font-semibold">Author</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Reactions</th>
              <th className="px-4 py-2.5 font-semibold">Comments</th>
              <th className="px-4 py-2.5 font-semibold">Reports</th>
              <th className="px-4 py-2.5 font-semibold">Posted</th>
              <th className="px-4 py-2.5 font-semibold">Status</th>
              <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => {
              const reportCount = reportMap.get(p.id) ?? 0;
              const totalReactions = p.reactions.length;
              return (
                <tr
                  key={p.id}
                  className="row-in border-t border-divider/60 align-top"
                  style={{ animationDelay: `${Math.min(i * 0.025, 0.3)}s` }}
                >
                  <td className="max-w-[280px] px-4 py-2.5">
                    <p className="line-clamp-2 text-foreground">{p.content || '(media/poll post)'}</p>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/users/${p.author.id}`} className="font-medium text-exeter hover:underline">
                      {p.author.anonymousHandle ?? 'Anonymous'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{p.category}</td>
                  <td className="px-4 py-2.5 tabular-nums">{totalReactions}</td>
                  <td className="px-4 py-2.5 tabular-nums">{p._count.comments}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {reportCount > 0 ? (
                      <span className="font-semibold text-red-500">{reportCount}</span>
                    ) : (
                      0
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{p.createdAt.toLocaleDateString('en-GB')}</td>
                  <td className="px-4 py-2.5">
                    {p.hiddenAt ? (
                      <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                        Hidden
                      </span>
                    ) : (
                      <span className="rounded-full bg-exeter/10 px-2 py-0.5 text-[11px] font-semibold text-exeter">
                        Live
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-3">
                      {p.hiddenAt ? (
                        <form action={unhidePostAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="text-[12px] font-medium text-exeter hover:underline">
                            Unhide
                          </button>
                        </form>
                      ) : (
                        <form action={hidePostAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="text-[12px] font-medium text-foreground hover:underline">
                            Hide
                          </button>
                        </form>
                      )}
                      <form action={deletePostAction}>
                        <input type="hidden" name="id" value={p.id} />
                        <ConfirmButton
                          confirmMessage="Permanently delete this post and its comments?"
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
            {posts.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted">
                  No posts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} basePath="/admin/posts" searchParams={{ q, filter }} />
    </div>
  );
}
