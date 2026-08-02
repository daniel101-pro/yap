'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

const tickStyle = { fill: 'var(--color-muted-light)', fontSize: 11 };

export default function ReportsBarChart({ data }: { data: { date: string; reports: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-divider)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          tick={tickStyle}
          tickLine={false}
          axisLine={false}
          minTickGap={20}
        />
        <YAxis allowDecimals={false} tick={tickStyle} tickLine={false} axisLine={false} width={22} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--color-surface)' }} />
        <Bar dataKey="reports" name="Reports" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}
