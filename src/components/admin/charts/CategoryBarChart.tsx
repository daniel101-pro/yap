'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import type { CategoryCount } from '@/lib/admin-analytics';

const COLORS = ['#00796B', '#26a69a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function CategoryBarChart({ data }: { data: CategoryCount[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-[13px] text-muted">No data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 34)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: 'var(--color-muted-light)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fill: 'var(--color-foreground)', fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          width={92}
        />
        <Tooltip content={<ChartTooltip dateLabel={false} />} cursor={{ fill: 'var(--color-surface)' }} />
        <Bar dataKey="count" name="Count" radius={[0, 6, 6, 0]} maxBarSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
