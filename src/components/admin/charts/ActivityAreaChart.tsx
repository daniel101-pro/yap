'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import type { ActivityPoint } from '@/lib/admin-analytics';

const tickStyle = { fill: 'var(--color-muted-light)', fontSize: 11 };

export default function ActivityAreaChart({ data }: { data: ActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-exeter)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-exeter)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorListings" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} width={26} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="users" name="Users" stroke="var(--color-exeter)" strokeWidth={2} fill="url(#colorUsers)" />
        <Area type="monotone" dataKey="posts" name="Posts" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPosts)" />
        <Area type="monotone" dataKey="listings" name="Listings" stroke="#f59e0b" strokeWidth={2} fill="url(#colorListings)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
