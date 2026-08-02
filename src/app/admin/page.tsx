import { prisma } from '@/lib/prisma';
import { Users, MessageSquare, ShoppingBag, PartyPopper, Flag, TrendingUp } from 'lucide-react';
import AnimatedStatCard from '@/components/admin/AnimatedStatCard';
import FadeInCard from '@/components/admin/FadeInCard';
import RecentActivityFeed from '@/components/admin/RecentActivityFeed';
import ActivityAreaChart from '@/components/admin/charts/ActivityAreaChart';
import CategoryBarChart from '@/components/admin/charts/CategoryBarChart';
import ReportsBarChart from '@/components/admin/charts/ReportsBarChart';
import { getActivityTrend, getCategoryBreakdown, getRecentActivity, getReportsTrend } from '@/lib/admin-analytics';

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
    activityTrend,
    reportsTrend,
    categoryBreakdown,
    recentActivity,
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
    getActivityTrend(30),
    getReportsTrend(14),
    getCategoryBreakdown(),
    getRecentActivity(15),
  ]);

  const resaleVolume = soldTickets.reduce((sum, t) => sum + t.price, 0);

  const iconClass = (accent?: boolean) => `h-5 w-5 ${accent ? 'text-red-500' : 'text-exeter'}`;

  const stats: {
    label: string;
    value: number;
    href: string;
    icon: React.ReactNode;
    prefix?: string;
    suffix?: string;
  }[] = [
    { label: 'Total users', value: userCount, href: '/admin/users', icon: <Users className={iconClass()} strokeWidth={1.8} /> },
    { label: 'New this week', value: newUsersThisWeek, href: '/admin/users', icon: <TrendingUp className={iconClass()} strokeWidth={1.8} /> },
    {
      label: 'Banned users',
      value: bannedCount,
      href: '/admin/users?filter=banned',
      icon: <Users className={iconClass(bannedCount > 0)} strokeWidth={1.8} />,
    },
    {
      label: 'Pending reports',
      value: pendingReportTargets.length,
      href: '/admin/reports',
      icon: <Flag className={iconClass(pendingReportTargets.length > 0)} strokeWidth={1.8} />,
    },
    { label: 'Posts', value: postCount, href: '/admin/posts', icon: <MessageSquare className={iconClass()} strokeWidth={1.8} /> },
    {
      label: 'Hidden posts',
      value: hiddenPostCount,
      href: '/admin/posts?filter=hidden',
      icon: <MessageSquare className={iconClass(hiddenPostCount > 0)} strokeWidth={1.8} />,
    },
    { label: 'Comments', value: commentCount, href: '/admin/comments', icon: <MessageSquare className={iconClass()} strokeWidth={1.8} /> },
    {
      label: 'Active listings',
      value: activeListingCount,
      href: '/admin/listings',
      icon: <ShoppingBag className={iconClass()} strokeWidth={1.8} />,
      suffix: ` / ${listingCount}`,
    },
    { label: 'Nightlife tickets', value: ticketCount, href: '/admin/nightlife', icon: <PartyPopper className={iconClass()} strokeWidth={1.8} /> },
    {
      label: 'Ticket resale volume',
      value: Math.round(resaleVolume),
      href: '/admin/nightlife',
      icon: <PartyPopper className={iconClass()} strokeWidth={1.8} />,
      prefix: '£',
    },
  ];

  return (
    <div>
      <h1 className="text-[20px] font-bold text-foreground">Overview</h1>
      <p className="mt-1 text-[13px] text-muted">Live snapshot of everything on YAP.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <AnimatedStatCard key={s.label} {...s} index={i} />
        ))}
      </div>

      <div className="mt-6">
        <FadeInCard title="Growth" subtitle="New users, posts, and listings — last 30 days" delay={0.1}>
          <ActivityAreaChart data={activityTrend} />
        </FadeInCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FadeInCard title="Posts by category" delay={0.15}>
          <CategoryBarChart data={categoryBreakdown.posts} />
        </FadeInCard>
        <FadeInCard title="Listings by category" delay={0.2}>
          <CategoryBarChart data={categoryBreakdown.listings} />
        </FadeInCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FadeInCard title="Reports filed" subtitle="Last 14 days" delay={0.25}>
          <ReportsBarChart data={reportsTrend} />
        </FadeInCard>
        <FadeInCard title="Recent activity" delay={0.3}>
          <RecentActivityFeed events={recentActivity} />
        </FadeInCard>
      </div>
    </div>
  );
}
