import { prisma } from '@/lib/prisma';

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function bucketByDay(dates: Date[], days: number): { date: string; count: number }[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(dayKey(d), 0);
  }
  for (const date of dates) {
    const key = dayKey(date);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

export interface ActivityPoint {
  date: string;
  users: number;
  posts: number;
  listings: number;
}

export async function getActivityTrend(days = 30): Promise<ActivityPoint[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [users, posts, listings] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.post.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.listing.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ]);

  const userBuckets = bucketByDay(users.map((u) => u.createdAt), days);
  const postBuckets = bucketByDay(posts.map((p) => p.createdAt), days);
  const listingBuckets = bucketByDay(listings.map((l) => l.createdAt), days);

  return userBuckets.map((b, i) => ({
    date: b.date,
    users: b.count,
    posts: postBuckets[i].count,
    listings: listingBuckets[i].count,
  }));
}

export async function getReportsTrend(days = 14): Promise<{ date: string; reports: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const reports = await prisma.report.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  return bucketByDay(reports.map((r) => r.createdAt), days).map((b) => ({
    date: b.date,
    reports: b.count,
  }));
}

export interface CategoryCount {
  category: string;
  count: number;
}

export async function getCategoryBreakdown(): Promise<{
  posts: CategoryCount[];
  listings: CategoryCount[];
}> {
  const [postGroups, listingGroups] = await Promise.all([
    prisma.post.groupBy({ by: ['category'], _count: { id: true } }),
    prisma.listing.groupBy({ by: ['category'], _count: { id: true } }),
  ]);

  const toSorted = (groups: { category: string; _count: { id: number } }[]) =>
    groups
      .map((g) => ({ category: g.category, count: g._count.id }))
      .sort((a, b) => b.count - a.count);

  return { posts: toSorted(postGroups), listings: toSorted(listingGroups) };
}

export interface ActivityEvent {
  id: string;
  type: 'user' | 'post' | 'listing' | 'report';
  label: string;
  timestamp: Date;
}

export async function getRecentActivity(limit = 15): Promise<ActivityEvent[]> {
  const [users, posts, listings, reports] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, anonymousHandle: true, email: true, createdAt: true },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        category: true,
        createdAt: true,
        author: { select: { anonymousHandle: true } },
      },
    }),
    prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        seller: { select: { anonymousHandle: true } },
      },
    }),
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, targetType: true, createdAt: true },
    }),
  ]);

  const events: ActivityEvent[] = [
    ...users.map((u) => ({
      id: `user-${u.id}`,
      type: 'user' as const,
      label: `${u.anonymousHandle ?? u.email} joined`,
      timestamp: u.createdAt,
    })),
    ...posts.map((p) => ({
      id: `post-${p.id}`,
      type: 'post' as const,
      label: `${p.author.anonymousHandle ?? 'Anonymous'} posted in ${p.category}`,
      timestamp: p.createdAt,
    })),
    ...listings.map((l) => ({
      id: `listing-${l.id}`,
      type: 'listing' as const,
      label: `${l.seller.anonymousHandle ?? 'Anonymous'} listed "${l.title}"`,
      timestamp: l.createdAt,
    })),
    ...reports.map((r) => ({
      id: `report-${r.id}`,
      type: 'report' as const,
      label: `New report on a ${r.targetType}`,
      timestamp: r.createdAt,
    })),
  ];

  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);
}
