'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReactionIcon } from '@/lib/icons';
import { Reaction } from '@/types';

interface ReactionButtonProps {
  reaction: Reaction;
  count: number;
  isActive: boolean;
  onReact: () => void;
}

export default function ReactionButton({ reaction, count, isActive, onReact }: ReactionButtonProps) {
  const [burst, setBurst] = useState<number[]>([]);
  const Icon = getReactionIcon(reaction);

  const handleClick = () => {
    if (!isActive) {
      setBurst((prev) => [...prev, Date.now()]);
      setTimeout(() => setBurst((prev) => prev.slice(1)), 400);
    }
    onReact();
  };

  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={handleClick}
      aria-label={`React with ${reaction}, ${count} reactions`}
      aria-pressed={isActive}
      className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] transition-all duration-200 min-h-[36px] ${
        isActive
          ? 'bg-exeter/15 text-exeter font-semibold'
          : 'bg-surface text-muted hover:bg-surface-hover'
      }`}
    >
      <AnimatePresence>
        {burst.map((id) => (
          <motion.span
            key={id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -18, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 1, 1] }}
            className="absolute -top-1 left-1/2 -translate-x-1/2 pointer-events-none"
            aria-hidden="true"
          >
            <Icon className="w-3.5 h-3.5" strokeWidth={2} />
          </motion.span>
        ))}
      </AnimatePresence>

      <Icon className="w-3.5 h-3.5" strokeWidth={1.8} aria-hidden="true" />
      <AnimatePresence mode="popLayout">
        <motion.span
          key={count}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.1 }}
          className="font-semibold tabular-nums"
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
