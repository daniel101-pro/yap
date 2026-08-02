'use client';

interface TooltipPayloadEntry {
  dataKey: string | number;
  name?: string;
  value?: number | string;
  color?: string;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  dateLabel?: boolean;
}

export function ChartTooltip({ active, payload, label, dateLabel = true }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const formattedLabel =
    dateLabel && label
      ? new Date(label).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : label;

  return (
    <div className="rounded-lg bg-background px-3 py-2 text-[12px] shadow-2xl ring-1 ring-divider">
      {formattedLabel && <p className="font-semibold text-foreground">{formattedLabel}</p>}
      {payload.map((p) => (
        <p key={String(p.dataKey)} style={{ color: p.color }} className="mt-0.5 font-medium">
          {p.name}: <span className="tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
}
