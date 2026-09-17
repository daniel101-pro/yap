'use client';

import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

type TicketLiveCelebrationProps = {
  title: string;
  venue: string;
  price: number;
  onDone: () => void;
};

const RINGS = [0, 0.18, 0.36];

export default function TicketLiveCelebration({
  title,
  venue,
  price,
  onDone,
}: TicketLiveCelebrationProps) {
  return (
    <motion.div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-hidden rounded-t-3xl bg-[#071412]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDone}
    >
      {RINGS.map((delay, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute h-48 w-48 rounded-full border border-exeter/35"
          initial={{ scale: 0.35, opacity: 0.55 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 1.6, delay, ease: 'easeOut', repeat: Infinity }}
        />
      ))}

      {[
        { x: '-5.5rem', y: '-7rem', d: 0.2 },
        { x: '6rem', y: '-6.2rem', d: 0.35 },
        { x: '-6.2rem', y: '4.5rem', d: 0.5 },
        { x: '5.4rem', y: '5.8rem', d: 0.28 },
      ].map((p) => (
        <motion.span
          key={`${p.x}${p.y}`}
          aria-hidden
          className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-exeter"
          style={{ translate: `${p.x} ${p.y}` }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0.4], scale: [0, 1.2, 0.8] }}
          transition={{ delay: p.d, duration: 1.4, ease: 'easeOut' }}
        />
      ))}

      <motion.div
        className="pointer-events-none absolute h-64 w-64 rounded-full bg-exeter/25 blur-3xl"
        animate={{ scale: [0.85, 1.15, 0.85], opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ y: 72, rotateX: 28, scale: 0.86, opacity: 0 }}
        animate={{ y: 0, rotateX: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.08 }}
        className="relative w-[min(20.5rem,86%)]"
        style={{ perspective: 900 }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12352f] via-[#0d2420] to-[#0a1a18] px-5 pb-5 pt-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
          <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">YAP nightlife</p>
          <p className="mt-2 text-[18px] font-black leading-snug text-white">{title}</p>
          <p className="mt-1 text-[13px] text-white/55">{venue}</p>
          <div className="mt-5 flex items-end justify-between">
            <p className="text-[28px] font-black tracking-tight text-white">£{price.toFixed(2)}</p>
            <motion.span
              initial={{ scale: 1.8, rotate: -18, opacity: 0 }}
              animate={{ scale: 1, rotate: -8, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16, delay: 0.42 }}
              className="rounded-md border-2 border-exeter px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-exeter shadow-[0_0_24px_rgba(0,121,107,0.55)]"
            >
              Live
            </motion.span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="relative mt-7 flex items-center gap-2 text-white"
      >
        <Sparkles className="h-4 w-4 text-exeter" strokeWidth={2} />
        <p className="text-[15px] font-bold">You’re live</p>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-1.5 text-[12px] text-white/50"
      >
        Buyers can grab it now
      </motion.p>
    </motion.div>
  );
}
