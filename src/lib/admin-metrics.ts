import { prisma } from '@/lib/prisma';
import {
  getActivityTrend,
  getCategoryBreakdown,
  getRecentActivity,
  getReportsTrend,
  type ActivityEvent,
  type ActivityPoint,
  type CategoryCount,
} from '@/lib/admin-analytics';

export interface AdminStat {
  key: string;
  label: string;
  value: number;
  href: string;
  prefix?: string;
  suffix?: string;
  alert?: boolean;
}

export interface AdminMetrics {
  stats: AdminStat[];
  badges: {
    pendingReports: number;
    bannedUsers: number;
    hiddenPosts: number;
    newUsersToday: number;
  };
  activityTrend: ActivityPoint[];
  reportsTrend: { date: string; reports: number }[];
  categoryBreakdown: { posts: CategoryCount[]; listings: CategoryCount[] };
  recentActivity: ActivityEvent[];
  updatedAt: string;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = startOfToday();

  const [
    userCount,
    bannedCount,
    newUsersThisWeek,
    newUsersToday,
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
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
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
    getRecentActivity(20),
  ]);

  const resaleVolume = soldTickets.reduce((sum, t) => sum + t.price, 0);
  const pendingReports = pendingReportTargets.length;

  const stats: AdminStat[] = [
    { key: 'users', label: 'Total users', value: userCount, href: '/admin/users' },
    { key: 'new-week', label: 'New this week', value: newUsersThisWeek, href: '/admin/users' },
    {
      key: 'banned',
      label: 'Banned users',
      value: bannedCount,
      href: '/admin/users?filter=banned',
      alert: bannedCount > 0,
    },
    {
      key: 'reports',
      label: 'Pending reports',
      value: pendingReports,
      href: '/admin/reports',
      alert: pendingReports > 0,
    },
    { key: 'posts', label: 'Posts', value: postCount, href: '/admin/posts' },
    {
      key: 'hidden-posts',
      label: 'Hidden posts',
      value: hiddenPostCount,
      href: '/admin/posts?filter=hidden',
      alert: hiddenPostCount > 0,
    },
    { key: 'comments', label: 'Comments', value: commentCount, href: '/admin/comments' },
    {
      key: 'listings',
      label: 'Active listings',
      value: activeListingCount,
      href: '/admin/listings',
      suffix: ` / ${listingCount}`,
    },
    { key: 'tickets', label: 'Nightlife tickets', value: ticketCount, href: '/admin/nightlife' },
    {
      key: 'resale',
      label: 'Ticket resale volume',
      value: Math.round(resaleVolume),
      href: '/admin/nightlife',
      prefix: '£',
    },
  ];

  return {
    stats,
    badges: {
      pendingReports,
      bannedUsers: bannedCount,
      hiddenPosts: hiddenPostCount,
      newUsersToday,
    },
    activityTrend,
    reportsTrend,
    categoryBreakdown,
    recentActivity,
    updatedAt: new Date().toISOString(),
  };
}

export function serializeAdminMetrics(metrics: AdminMetrics) {
  return {
    ...metrics,
    recentActivity: metrics.recentActivity.map((e) => ({
      ...e,
      timestamp: e.timestamp.toISOString(),
    })),
  };
}

export type SerializedAdminMetrics = ReturnType<typeof serializeAdminMetrics>;
