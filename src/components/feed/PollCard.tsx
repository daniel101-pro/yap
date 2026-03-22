'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Poll } from '@/types';
import { formatNumber } from '@/lib/utils';

interface PollCardProps {
  poll: Poll;
}

export default function PollCard({ poll }: PollCardProps) {
  const [voted, setVoted] = useState<number | undefined>(poll.userVote);

  const handleVote = (optionId: number) => {
    if (voted !== undefined) return;
    setVoted(optionId);
  };

  const totalWithVote = poll.totalVotes + (voted !== undefined ? 1 : 0);

  return (
    <div className="space-y-2 mb-1">
      <h3 className="text-[15px] font-semibold text-foreground">{poll.question}</h3>
      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const percentage = voted !== undefined
            ? Math.round((option.votes / totalWithVote) * 100)
            : 0;
          const isSelected = voted === option.id;

          return (
            <motion.button
              key={option.id}
              whileTap={voted === undefined ? { scale: 0.99 } : {}}
              onClick={() => handleVote(option.id)}
              className={`relative w-full text-left rounded-xl overflow-hidden transition-all duration-300 ${
                voted !== undefined ? 'cursor-default' : 'cursor-pointer'
              } ${isSelected ? 'bg-exeter-pale' : 'bg-surface'}`}
            >
              {/* Fill bar */}
              {voted !== undefined && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentage}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                  className={`absolute inset-y-0 left-0 ${
                    isSelected ? 'bg-exeter/10' : 'bg-surface-hover'
                  }`}
                />
              )}

              <div className="relative flex items-center justify-between px-4 py-3">
                <span className={`text-[13px] font-medium ${
                  isSelected ? 'text-exeter' : 'text-foreground'
                }`}>
                  {option.text}
                </span>
                {voted !== undefined && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className={`text-[13px] font-bold tabular-nums ${
                      isSelected ? 'text-exeter' : 'text-muted'
                    }`}
                  >
                    {percentage}%
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted mt-1">
        {formatNumber(totalWithVote)} votes
      </p>
    </div>
  );
}
