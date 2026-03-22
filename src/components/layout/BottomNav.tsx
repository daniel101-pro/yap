'use client';

import { motion } from 'framer-motion';
import { Flame, ShoppingBag, Plus, User } from 'lucide-react';
import { useStore } from '@/lib/store';

const tabs = [
  { id: 'feed' as const, icon: Flame, label: 'Feed' },
  { id: 'market' as const, icon: ShoppingBag, label: 'Market' },
  { id: 'create' as const, icon: Plus, label: 'Post' },
  { id: 'profile' as const, icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const { activeTab, setActiveTab, setShowCreateModal } = useStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-xl border-t border-white/[0.04]" aria-label="Main navigation">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-4 pt-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCreate = tab.id === 'create';

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isCreate) {
                  setShowCreateModal(true);
                } else {
                  setActiveTab(tab.id);
                }
              }}
              aria-label={isCreate ? 'Create new post' : tab.label}
              aria-current={isActive && !isCreate ? 'page' : undefined}
              className={`relative flex flex-col items-center min-h-[48px] min-w-[48px] justify-center ${isCreate ? 'px-3' : 'px-5'}`}
            >
              {isCreate ? (
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className="w-11 h-11 rounded-2xl bg-exeter flex items-center justify-center -mt-3"
                >
                  <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
                </motion.div>
              ) : (
                <>
                  <tab.icon
                    className={`w-[21px] h-[21px] transition-all duration-300 ${
                      isActive ? 'text-white' : 'text-muted-light'
                    }`}
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[10px] mt-1 font-medium transition-all duration-300 ${
                      isActive ? 'text-white' : 'text-muted-light'
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-dot"
                      className="absolute -top-1 w-5 h-0.5 bg-exeter rounded-full"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
