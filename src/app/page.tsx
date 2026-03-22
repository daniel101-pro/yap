'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import HeroSection from '@/components/landing/HeroSection';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import CreatePostModal from '@/components/feed/CreatePostModal';
import FeedPage from '@/components/pages/FeedPage';
import MarketplacePage from '@/components/pages/MarketplacePage';
import ProfilePage from '@/components/pages/ProfilePage';
import SettingsPage from '@/components/pages/SettingsPage';
import NotificationsPage from '@/components/pages/NotificationsPage';

export default function Home() {
  const { isAuthenticated, activeTab, theme, showSettings, showNotifications } = useStore();

  if (!isAuthenticated) {
    return (
      <div className="dark">
        <HeroSection />
      </div>
    );
  }

  if (showNotifications) {
    return (
      <div className={`min-h-dvh bg-background ${theme === 'dark' ? 'dark' : ''}`}>
        <NotificationsPage />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className={`min-h-dvh bg-background ${theme === 'dark' ? 'dark' : ''}`}>
        <SettingsPage />
      </div>
    );
  }

  return (
    <div className={`min-h-dvh bg-background ${theme === 'dark' ? 'dark' : ''}`}>
      <TopBar />

      <main className="pt-16 pb-24 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <FeedPage />
            </motion.div>
          )}
          {activeTab === 'market' && (
            <motion.div
              key="market"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <MarketplacePage />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ProfilePage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav />
      <CreatePostModal />
    </div>
  );
}
