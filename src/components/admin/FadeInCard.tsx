'use client';

import { motion } from 'framer-motion';

export default function FadeInCard({
  title,
  subtitle,
  delay = 0,
  children,
}: {
  title: string;
  subtitle?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl bg-surface/50 p-5 ring-1 ring-divider"
    >
      <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </motion.div>
  );
}
