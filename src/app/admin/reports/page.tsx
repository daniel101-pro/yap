import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ConfirmButton from '@/components/admin/ConfirmButton';
import {
  hidePostAction,
  hideCommentAction,
  dismissReportsAction,
  restoreAndDismissAction,
} from '@/lib/admin-actions';

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: { reporter: { select: { anonymousHandle: true } } },
  });

  const groups = new Map<string, typeof reports>();
  for (const r of reports) {
    const key = `${r.targetType}:${r.targetId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const postIds = [...groups.keys()].filter((k) => k.startsWith('post:')).map((k) => k.slice(5));
  const commentIds = [...groups.keys()].filter((k) => k.startsWith('comment:')).map((k) => k.slice(8));

  const [posts, comments] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: postIds } },
      include: { author: { select: { id: true, anonymousHandle: true } } },
    }),
    prisma.comment.findMany({
      where: { id: { in: commentIds } },
      include: { author: { select: { id: true, anonymousHandle: true } } },
    }),
  ]);
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));

  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="max-w-4xl">
      <h1 className="text-[20px] font-bold text-foreground">Reports</h1>
      <p className="mt-1 text-[13px] text-muted">
        {sortedGroups.length} reported item{sortedGroups.length === 1 ? '' : 's'} · {reports.length} report
        {reports.length === 1 ? '' : 's'} total
      </p>

      <div className="mt-5 space-y-3">
        {sortedGroups.length === 0 && (
          <div className="rounded-2xl bg-surface/50 px-5 py-10 text-center text-[13px] text-muted ring-1 ring-divider">
            No reports filed. All clear.
          </div>
        )}

        {sortedGroups.map(([key, groupReports]) => {
          const [targetType, targetId] = key.split(':') as ['post' | 'comment', string];
          const post = targetType === 'post' ? postMap.get(targetId) : undefined;
          const comment = targetType === 'comment' ? commentMap.get(targetId) : undefined;
          const target = post ?? comment;
          const isHidden = Boolean(target?.hiddenAt);
          const authorId = post?.author.id ?? comment?.author.id;
          const authorHandle = post?.author.anonymousHandle ?? comment?.author.anonymousHandle;
          const reasons = groupReports.map((r) => r.reason).filter(Boolean);

          return (
            <div key={key} className="rounded-2xl bg-surface/50 p-4 ring-1 ring-divider">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-500">
                      {groupReports.length} report{groupReports.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-muted">{targetType}</span>
                    {isHidden && (
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-semibold text-muted">
                        Already hidden
                      </span>
                    )}
                  </div>

                  <p className="mt-2 line-clamp-3 text-[13px] text-foreground">
                    {target ? target.content || '(media/poll post)' : '(content deleted)'}
                  </p>

                  {authorId && (
                    <p className="mt-1 text-[12px] text-muted">
                      by{' '}
                      <Link href={`/admin/users/${authorId}`} className="font-medium text-exeter hover:underline">
                        {authorHandle ?? 'Anonymous'}
                      </Link>
                    </p>
                  )}

                  {reasons.length > 0 && (
                    <p className="mt-2 text-[12px] text-muted-light">
                      Reasons: {reasons.slice(0, 3).join(' · ')}
                    </p>
                  )}
                </div>

                <div className="flex flex-shrink-0 flex-col items-end gap-2">
                  {target && (
                    <Link
                      href={targetType === 'post' ? `/admin/posts?q=${encodeURIComponent(target.id)}` : `/admin/comments?q=${encodeURIComponent(target.id)}`}
                      className="text-[12px] font-medium text-exeter hover:underline"
                    >
                      View in list
                    </Link>
                  )}

                  {target && !isHidden && (
                    <form action={targetType === 'post' ? hidePostAction : hideCommentAction}>
                      <input type="hidden" name="id" value={targetId} />
                      <button className="text-[12px] font-medium text-foreground hover:underline">
                        Hide now
                      </button>
                    </form>
                  )}

                  {target && isHidden && (
                    <form action={restoreAndDismissAction}>
                      <input type="hidden" name="targetType" value={targetType} />
                      <input type="hidden" name="targetId" value={targetId} />
                      <button className="text-[12px] font-medium text-exeter hover:underline">
                        Restore &amp; dismiss
                      </button>
                    </form>
                  )}

                  <form action={dismissReportsAction}>
                    <input type="hidden" name="targetType" value={targetType} />
                    <input type="hidden" name="targetId" value={targetId} />
                    <ConfirmButton
                      confirmMessage="Dismiss all reports on this item without changing its visibility?"
                      className="text-[12px] font-medium text-muted hover:underline"
                    >
                      Dismiss reports
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
