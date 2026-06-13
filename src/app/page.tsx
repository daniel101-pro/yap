'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useStore } from '@/lib/store';
import HeroSection from '@/components/landing/HeroSection';
import TopBar from '@/components/layout/TopBar';
import BottomNav from '@/components/layout/BottomNav';
import CreatePostModal from '@/components/feed/CreatePostModal';
import FeedPage from '@/components/pages/FeedPage';
import MarketplacePage from '@/components/pages/MarketplacePage';
import NightlifePage from '@/components/pages/NightlifePage';
import ProfilePage from '@/components/pages/ProfilePage';
import SettingsPage from '@/components/pages/SettingsPage';
import NotificationsPage from '@/components/pages/NotificationsPage';
import { useLiveSync } from '@/hooks/useLiveSync';

export default function Home() {
  const { data: session, status } = useSession();
  const {
    activeTab,
    theme,
    themePreference,
    setThemePreference,
    setResolvedTheme,
    showSettings,
    showNotifications,
    hydrateFromServer,
    isHydrated,
    isHydrating,
    hydrationError,
    loadLocalPreferences,
    setActiveTab,
  } = useStore();

  useLiveSync();

  useEffect(() => {
    loadLocalPreferences();
  }, [loadLocalPreferences]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('theme-preference');
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setThemePreference(saved);
      if (saved === 'light' || saved === 'dark') {
        setResolvedTheme(saved);
      }
    }
  }, [setResolvedTheme, setThemePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('theme-preference', themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const applySystemTheme = () => setResolvedTheme(media.matches ? 'dark' : 'light');

    if (themePreference === 'system') {
      applySystemTheme();
      const onChange = () => applySystemTheme();
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
  }, [themePreference, setResolvedTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    hydrateFromServer();
  }, [status, hydrateFromServer]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'feed' || tab === 'market' || tab === 'nightlife' || tab === 'profile') {
      setActiveTab(tab);
    }
  }, [setActiveTab]);

  if (status === 'loading' || (session && !isHydrated && isHydrating && !hydrationError)) {
    return (
      <div className="min-h-dvh bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-exeter border-t-transparent animate-spin" />
      </div>
    );
  }

  if (session && hydrationError && !isHydrated) {
    return (
      <div className={`min-h-dvh bg-background flex flex-col items-center justify-center px-6 text-center ${theme === 'dark' ? 'dark' : ''}`}>
        <p className="text-[16px] font-semibold text-foreground mb-2">Couldn&apos;t load YAP</p>
        <p className="text-[14px] text-muted mb-6 max-w-sm">{hydrationError}</p>
        <button
          onClick={() => hydrateFromServer()}
          className="rounded-full bg-exeter px-6 py-3 text-[14px] font-semibold text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!session) {
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
          {activeTab === 'nightlife' && (
            <motion.div
              key="nightlife"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <NightlifePage />
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
