import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import ConfirmButton from '@/components/admin/ConfirmButton';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  hidePostAction,
  hideCommentAction,
  hideListingAction,
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
  const listingIds = [...groups.keys()].filter((k) => k.startsWith('listing:')).map((k) => k.slice(8));

  const [posts, comments, listings] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: postIds } },
      include: { author: { select: { id: true, anonymousHandle: true } } },
    }),
    prisma.comment.findMany({
      where: { id: { in: commentIds } },
      include: { author: { select: { id: true, anonymousHandle: true } } },
    }),
    prisma.listing.findMany({
      where: { id: { in: listingIds } },
      include: { seller: { select: { id: true, anonymousHandle: true } } },
    }),
  ]);
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  const listingMap = new Map(listings.map((l) => [l.id, l]));

  const sortedGroups = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      <AdminPageHeader
        title="Reports queue"
        subtitle={`${sortedGroups.length} item${sortedGroups.length === 1 ? '' : 's'} flagged · ${reports.length} total report${reports.length === 1 ? '' : 's'}`}
      />

      <div className="space-y-3">
        {sortedGroups.length === 0 && (
          <div className="rounded-2xl border border-divider bg-surface/30 px-5 py-16 text-center">
            <p className="text-[15px] font-semibold text-foreground">All clear</p>
            <p className="mt-1 text-[13px] text-muted">No open reports right now.</p>
          </div>
        )}

        {sortedGroups.map(([key, groupReports], i) => {
          const [targetType, targetId] = key.split(':') as ['post' | 'comment' | 'listing', string];
          const post = targetType === 'post' ? postMap.get(targetId) : undefined;
          const comment = targetType === 'comment' ? commentMap.get(targetId) : undefined;
          const listing = targetType === 'listing' ? listingMap.get(targetId) : undefined;
          const target = post ?? comment ?? listing;
          const isHidden = Boolean(target && 'hiddenAt' in target && target.hiddenAt);
          const authorId = post?.author.id ?? comment?.author.id ?? listing?.seller.id;
          const authorHandle =
            post?.author.anonymousHandle ?? comment?.author.anonymousHandle ?? listing?.seller.anonymousHandle;
          const displayContent =
            post?.content ??
            comment?.content ??
            (listing ? `${listing.title} — £${listing.price}` : undefined);
          const reasons = groupReports.map((r) => r.reason).filter(Boolean);
          const severity = groupReports.length >= 5 ? 'critical' : groupReports.length >= 2 ? 'high' : 'normal';

          return (
            <div
              key={key}
              className={`row-in rounded-2xl border p-4 transition-colors ${
                severity === 'critical'
                  ? 'border-red-500/30 bg-red-500/[0.04]'
                  : severity === 'high'
                    ? 'border-amber-500/25 bg-amber-500/[0.03]'
                    : 'border-divider bg-surface/30'
              }`}
              style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-red-500/12 px-2.5 py-0.5 text-[11px] font-bold text-red-500">
                      {groupReports.length} report{groupReports.length === 1 ? '' : 's'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">{targetType}</span>
                    {isHidden && (
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[10px] font-bold text-muted">
                        Hidden
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-3 text-[14px] leading-relaxed text-foreground">
                    {target ? displayContent || '(media/poll post)' : '(content deleted)'}
                  </p>

                  {authorId && (
                    <p className="mt-2 text-[12px] text-muted">
                      by{' '}
                      <Link href={`/admin/users/${authorId}`} className="font-semibold text-exeter hover:underline">
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
                      href={
                        targetType === 'post'
                          ? `/admin/posts?q=${encodeURIComponent(target.id)}`
                          : targetType === 'comment'
                            ? `/admin/comments?q=${encodeURIComponent(target.id)}`
                            : `/admin/listings?q=${encodeURIComponent(listing!.title)}`
                      }
                      className="text-[12px] font-semibold text-exeter hover:underline"
                    >
                      View in list
                    </Link>
                  )}

                  {target && !isHidden && (
                    <form
                      action={
                        targetType === 'post'
                          ? hidePostAction
                          : targetType === 'comment'
                            ? hideCommentAction
                            : hideListingAction
                      }
                    >
                      <input type="hidden" name="id" value={targetId} />
                      <button className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-semibold text-background hover:opacity-90">
                        Hide now
                      </button>
                    </form>
                  )}

                  {target && isHidden && (
                    <form action={restoreAndDismissAction}>
                      <input type="hidden" name="targetType" value={targetType} />
                      <input type="hidden" name="targetId" value={targetId} />
                      <button className="text-[12px] font-semibold text-exeter hover:underline">
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
                      Dismiss
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
