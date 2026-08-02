import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Users, MessageSquare, ShoppingBag, PartyPopper, Flag, TrendingUp } from 'lucide-react';

function StatCard({
  label,
  value,
  href,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  href: string;
  icon: React.ElementType;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-surface/60 p-5 ring-1 ring-divider transition-colors hover:bg-surface"
    >
      <div className="flex items-center justify-between">
        <Icon className={`h-5 w-5 ${accent ? 'text-red-500' : 'text-exeter'}`} strokeWidth={1.8} />
      </div>
      <p className="mt-4 text-[26px] font-bold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-[12px] font-medium text-muted">{label}</p>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    userCount,
    bannedCount,
    newUsersThisWeek,
    postCount,
    hiddenPostCount,
    commentCount,
    listingCount,
    activeListingCount,
    ticketCount,
    soldTickets,
    pendingReportTargets,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isBanned: true } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.post.count(),
    prisma.post.count({ where: { hiddenAt: { not: null } } }),
    prisma.comment.count(),
    prisma.listing.count(),
    prisma.listing.count({ where: { isSold: false, hiddenAt: null } }),
    prisma.nightlifeTicket.count(),
    prisma.nightlifeTicket.findMany({ where: { status: 'sold' }, select: { price: true } }),
    prisma.report.findMany({ select: { targetType: true, targetId: true }, distinct: ['targetType', 'targetId'] }),
  ]);

  const resaleVolume = soldTickets.reduce((sum, t) => sum + t.price, 0);

  return (
    <div>
      <h1 className="text-[20px] font-bold text-foreground">Overview</h1>
      <p className="mt-1 text-[13px] text-muted">Live snapshot of everything on YAP.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={userCount} href="/admin/users" icon={Users} />
        <StatCard
          label="New this week"
          value={newUsersThisWeek}
          href="/admin/users"
          icon={TrendingUp}
        />
        <StatCard
          label="Banned users"
          value={bannedCount}
          href="/admin/users?filter=banned"
          icon={Users}
          accent={bannedCount > 0}
        />
        <StatCard
          label="Pending reports"
          value={pendingReportTargets.length}
          href="/admin/reports"
          icon={Flag}
          accent={pendingReportTargets.length > 0}
        />
        <StatCard label="Posts" value={postCount} href="/admin/posts" icon={MessageSquare} />
        <StatCard
          label="Hidden posts"
          value={hiddenPostCount}
          href="/admin/posts?filter=hidden"
          icon={MessageSquare}
          accent={hiddenPostCount > 0}
        />
        <StatCard label="Comments" value={commentCount} href="/admin/comments" icon={MessageSquare} />
        <StatCard
          label="Active listings"
          value={`${activeListingCount} / ${listingCount}`}
          href="/admin/listings"
          icon={ShoppingBag}
        />
        <StatCard
          label="Nightlife tickets"
          value={ticketCount}
          href="/admin/nightlife"
          icon={PartyPopper}
        />
        <StatCard
          label="Ticket resale volume"
          value={`£${resaleVolume.toFixed(0)}`}
          href="/admin/nightlife"
          icon={PartyPopper}
        />
      </div>
    </div>
  );
}
