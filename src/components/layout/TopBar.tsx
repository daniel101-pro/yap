'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, X } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function TopBar() {
  const {
    activeTab,
    showSearch,
    setShowSearch,
    searchQuery,
    setSearchQuery,
    setShowNotifications,
    notifications,
  } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const title = activeTab === 'feed' ? null : activeTab === 'market' ? 'Market' : 'Profile';

  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-divider">
      <div className="max-w-2xl mx-auto flex items-center justify-between px-5 h-14">
        <AnimatePresence mode="wait">
          {showSearch ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 flex-1"
            >
              <Search className="w-4 h-4 text-muted flex-shrink-0" />
              <input
                ref={inputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'feed' ? 'Search yaps...' : activeTab === 'market' ? 'Search listings...' : 'Search...'}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-light focus:outline-none"
              />
              <button
                onClick={() => setShowSearch(false)}
                className="p-1.5 rounded-full hover:bg-surface-hover transition-colors"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </motion.div>
          ) : (
            <>
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

              <div className="flex items-center gap-1">
                {(activeTab === 'feed' || activeTab === 'market') && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setShowSearch(true)}
                    className="relative p-2.5 rounded-full hover:bg-surface transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  >
                    <Search className="w-[18px] h-[18px] text-muted" strokeWidth={1.8} />
                  </motion.button>
                )}

                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setShowNotifications(true)}
                  className="relative p-2.5 -mr-2.5 rounded-full hover:bg-surface transition-colors duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <Bell className="w-[18px] h-[18px] text-muted" strokeWidth={1.8} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 min-w-[16px] h-4 bg-exeter rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    </span>
                  )}
                </motion.button>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
