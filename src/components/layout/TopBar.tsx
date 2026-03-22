'use client';

import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function TopBar() {
  const { activeTab } = useStore();

  const title = activeTab === 'feed' ? null : activeTab === 'market' ? 'Market' : 'Profile';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-divider">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-5 h-14">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {title ? (
            <h1 className="text-[17px] font-bold tracking-tight text-foreground">{title}</h1>
          ) : (
            <h1 className="text-[20px] font-black tracking-tight text-foreground">Y<span className="text-exeter">_</span></h1>
          )}
        </motion.div>

        <motion.button
          whileTap={{ scale: 0.92 }}
          className="relative p-2.5 -mr-2.5 rounded-full hover:bg-surface transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Bell className="w-[18px] h-[18px] text-muted" strokeWidth={1.8} />
          <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-exeter rounded-full" />
        </motion.button>
      </div>
    </header>
  );
}
