'use client';

import { useEffect, useState } from 'react';
import { animate, motion } from 'framer-motion';
import Link from 'next/link';

interface AnimatedStatCardProps {
  label: string;
  value: number;
  href: string;
  icon: React.ElementType;
  accent?: boolean;
  index: number;
  prefix?: string;
  suffix?: string;
}

export default function AnimatedStatCard({
  label,
  value,
  href,
  icon: Icon,
  accent,
  index,
  prefix = '',
  suffix = '',
}: AnimatedStatCardProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      delay: index * 0.04,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, index]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <Link
        href={href}
        className="block rounded-2xl bg-surface/60 p-5 ring-1 ring-divider transition-colors hover:bg-surface hover:ring-exeter/30"
      >
        <Icon className={`h-5 w-5 ${accent ? 'text-red-500' : 'text-exeter'}`} strokeWidth={1.8} />
        <p className="mt-4 text-[26px] font-bold tabular-nums text-foreground">
          {prefix}
          {display.toLocaleString()}
          {suffix}
        </p>
        <p className="mt-0.5 text-[12px] font-medium text-muted">{label}</p>
      </Link>
    </motion.div>
  );
}
