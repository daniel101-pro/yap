import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { banUserAction, unbanUserAction, deleteUserAction } from '@/lib/admin-actions';
import ConfirmButton from '@/components/admin/ConfirmButton';

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      posts: { orderBy: { createdAt: 'desc' }, take: 20 },
      listings: { orderBy: { createdAt: 'desc' }, take: 20 },
      reportsMade: { orderBy: { createdAt: 'desc' }, take: 20 },
      _count: {
        select: {
          posts: true,
          comments: true,
          listings: true,
          reportsMade: true,
          buyerConversations: true,
          sellerConversations: true,
        },
      },
    },
  });

  if (!user) notFound();

  const reportsReceived = await prisma.report.count({
    where: {
      OR: [
        { targetType: 'post', targetId: { in: user.posts.map((p) => p.id) } },
      ],
    },
  });

  return (
    <div className="max-w-3xl">
      <Link href="/admin/users" className="flex items-center gap-1 text-[13px] font-medium text-muted hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Back to users
      </Link>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-foreground">{user.anonymousHandle ?? 'Anonymous'}</h1>
          <p className="mt-0.5 text-[13px] text-muted">{user.email}</p>
        </div>
        {user.isBanned ? (
          <form action={unbanUserAction}>
            <input type="hidden" name="id" value={user.id} />
            <button className="rounded-full bg-exeter px-4 py-2 text-[13px] font-semibold text-white">
              Unban user
            </button>
          </form>
        ) : (
          <form action={banUserAction}>
            <input type="hidden" name="id" value={user.id} />
            <ConfirmButton
              confirmMessage="Ban this user? They will be signed out and unable to log back in."
              className="rounded-full bg-red-500 px-4 py-2 text-[13px] font-semibold text-white"
            >
              Ban user
            </ConfirmButton>
          </form>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5">
        {[
          ['Karma', user.karma],
          ['Posts', user._count.posts],
          ['Comments', user._count.comments],
          ['Listings', user._count.listings],
          ['Reports made', user._count.reportsMade],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl bg-surface/60 p-3 text-center ring-1 ring-divider">
            <p className="text-[18px] font-bold tabular-nums text-foreground">{value}</p>
            <p className="text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>

      {reportsReceived > 0 && (
        <div className="mt-4 rounded-xl bg-red-500/5 px-4 py-3 text-[13px] font-medium text-red-500 ring-1 ring-red-500/20">
          {reportsReceived} report{reportsReceived === 1 ? '' : 's'} filed against this user&apos;s posts
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-[14px] font-semibold text-foreground">Recent posts</h2>
        <div className="mt-2 divide-y divide-divider/60 rounded-xl bg-surface/40 ring-1 ring-divider">
          {user.posts.length === 0 && <p className="px-4 py-4 text-[13px] text-muted">No posts</p>}
          {user.posts.map((p) => (
            <div key={p.id} className="px-4 py-3 text-[13px]">
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 text-foreground">{p.content || '(media/poll post)'}</span>
                {p.hiddenAt && (
                  <span className="flex-shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-500">
                    Hidden
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted">
                {p.category} · {p.createdAt.toLocaleDateString('en-GB')}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[14px] font-semibold text-foreground">Recent listings</h2>
        <div className="mt-2 divide-y divide-divider/60 rounded-xl bg-surface/40 ring-1 ring-divider">
          {user.listings.length === 0 && <p className="px-4 py-4 text-[13px] text-muted">No listings</p>}
          {user.listings.map((l) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3 text-[13px]">
              <span className="text-foreground">{l.title}</span>
              <span className="tabular-nums text-muted">£{l.price}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-xl bg-red-500/5 p-4 ring-1 ring-red-500/20">
        <h2 className="text-[13px] font-semibold text-red-500">Danger zone</h2>
        <p className="mt-1 text-[12px] text-muted">
          Permanently deletes this user and everything they created — posts, comments, listings,
          messages, tickets. Cannot be undone.
        </p>
        <form action={deleteUserAction} className="mt-3">
          <input type="hidden" name="id" value={user.id} />
          <ConfirmButton
            confirmMessage={`Permanently delete ${user.anonymousHandle ?? user.email} and all their content? This cannot be undone.`}
            className="rounded-full bg-red-500 px-4 py-2 text-[13px] font-semibold text-white"
          >
            Delete account permanently
          </ConfirmButton>
        </form>
      </section>
    </div>
  );
}
