'use client';

import { useEffect, useState } from 'react';
import { Users, MessageSquare, ShoppingBag, PartyPopper, Flag, TrendingUp } from 'lucide-react';
import AnimatedStatCard from '@/components/admin/AnimatedStatCard';
import FadeInCard from '@/components/admin/FadeInCard';
import RecentActivityFeed from '@/components/admin/RecentActivityFeed';
import ActivityAreaChart from '@/components/admin/charts/ActivityAreaChart';
import CategoryBarChart from '@/components/admin/charts/CategoryBarChart';
import ReportsBarChart from '@/components/admin/charts/ReportsBarChart';
import type { SerializedAdminMetrics } from '@/lib/admin-metrics';

const ICONS: Record<string, React.ReactNode> = {
  users: <Users className="h-5 w-5 text-exeter" strokeWidth={1.8} />,
  'new-week': <TrendingUp className="h-5 w-5 text-exeter" strokeWidth={1.8} />,
  banned: <Users className="h-5 w-5 text-red-500" strokeWidth={1.8} />,
  reports: <Flag className="h-5 w-5 text-red-500" strokeWidth={1.8} />,
  posts: <MessageSquare className="h-5 w-5 text-exeter" strokeWidth={1.8} />,
  'hidden-posts': <MessageSquare className="h-5 w-5 text-red-500" strokeWidth={1.8} />,
  comments: <MessageSquare className="h-5 w-5 text-exeter" strokeWidth={1.8} />,
  listings: <ShoppingBag className="h-5 w-5 text-exeter" strokeWidth={1.8} />,
  tickets: <PartyPopper className="h-5 w-5 text-exeter" strokeWidth={1.8} />,
  resale: <PartyPopper className="h-5 w-5 text-exeter" strokeWidth={1.8} />,
};

const POLL_MS = 12_000;

export default function AdminOverviewDashboard({
  initial,
}: {
  initial: SerializedAdminMetrics;
}) {
  const [metrics, setMetrics] = useState(initial);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/admin/metrics', { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SerializedAdminMetrics;
        setMetrics(data);
      } catch {
        // ignore
      }
    };

    const interval = setInterval(poll, POLL_MS);
    document.addEventListener('visibilitychange', poll);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', poll);
    };
  }, []);

  const priorityStats = metrics.stats.filter((s) => s.alert);
  const regularStats = metrics.stats.filter((s) => !s.alert);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Command center</h1>
        <p className="mt-1 text-[13px] text-muted">
          Real-time snapshot of YAP — auto-refreshes every 12 seconds.
        </p>
      </div>

      {priorityStats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {priorityStats.map((s) => (
            <a
              key={s.key}
              href={s.href}
              className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-[12px] font-semibold text-red-600 ring-1 ring-red-500/20 transition-colors hover:bg-red-500/15 dark:text-red-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {s.label}: {s.value}
            </a>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
        {regularStats.map((s, i) => (
          <AnimatedStatCard
            key={s.key}
            label={s.label}
            value={s.value}
            href={s.href}
            icon={ICONS[s.key] ?? ICONS.users}
            index={i}
            prefix={s.prefix}
            suffix={s.suffix}
            alert={s.alert}
          />
        ))}
        {priorityStats.map((s, i) => (
          <AnimatedStatCard
            key={s.key}
            label={s.label}
            value={s.value}
            href={s.href}
            icon={ICONS[s.key] ?? ICONS.users}
            index={regularStats.length + i}
            prefix={s.prefix}
            suffix={s.suffix}
            alert={s.alert}
          />
        ))}
      </div>

      <div className="mt-6">
        <FadeInCard title="Growth" subtitle="New users, posts, and listings — last 30 days" delay={0.1}>
          <ActivityAreaChart data={metrics.activityTrend} />
        </FadeInCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FadeInCard title="Posts by category" delay={0.15}>
          <CategoryBarChart data={metrics.categoryBreakdown.posts} />
        </FadeInCard>
        <FadeInCard title="Listings by category" delay={0.2}>
          <CategoryBarChart data={metrics.categoryBreakdown.listings} />
        </FadeInCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <FadeInCard title="Reports filed" subtitle="Last 14 days" delay={0.25}>
          <ReportsBarChart data={metrics.reportsTrend} />
        </FadeInCard>
        <FadeInCard title="Live activity feed" subtitle="Latest across the platform" delay={0.3}>
          <RecentActivityFeed events={metrics.recentActivity} />
        </FadeInCard>
      </div>
    </div>
  );
}
