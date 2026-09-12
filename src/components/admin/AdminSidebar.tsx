'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  ShoppingBag,
  PartyPopper,
  Flag,
  Mail,
  ExternalLink,
  Moon,
  Sun,
  Shield,
} from 'lucide-react';
import { useAdminBadges } from '@/hooks/useAdminLiveSync';

type BadgeKey = 'pendingReports' | 'hiddenPosts';

const NAV: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badgeKey?: BadgeKey;
}[] = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/posts', label: 'Posts', icon: MessageSquare, badgeKey: 'hiddenPosts' },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/listings', label: 'Listings', icon: ShoppingBag },
  { href: '/admin/nightlife', label: 'Nightlife', icon: PartyPopper },
  { href: '/admin/reports', label: 'Reports', icon: Flag, badgeKey: 'pendingReports' },
  { href: '/admin/conversations', label: 'Messages', icon: Mail },
];

const THEME_KEY = 'theme-preference';

function resolveIsDark(): boolean {
  if (typeof window === 'undefined') return false;
  const pref = window.localStorage.getItem(THEME_KEY);
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const badges = useAdminBadges();

  useEffect(() => {
    setIsDark(resolveIsDark());
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const getBadge = (key?: BadgeKey) => {
    if (!key) return 0;
    return badges[key] ?? 0;
  };

  return (
    <aside className="flex h-dvh w-60 flex-shrink-0 flex-col border-r border-divider bg-[#0a1210] text-white dark:bg-[#0a0a0a]">
      <div className="border-b border-white/10 px-4 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-exeter text-[14px] font-black text-white shadow-[0_4px_12px_rgba(0,121,107,0.4)]">
              Y
            </div>
            <div>
              <p className="text-[14px] font-bold leading-none">YAP Admin</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-white/45">
                <Shield className="h-3 w-3" strokeWidth={2} />
                Exeter campus
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <motion.div
              key={isDark ? 'moon' : 'sun'}
              initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {isDark ? <Moon className="h-4 w-4" strokeWidth={1.8} /> : <Sun className="h-4 w-4" strokeWidth={1.8} />}
            </motion.div>
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
          Moderation
        </p>
        {NAV.map(({ href, label, icon: Icon, exact, badgeKey }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const badge = getBadge(badgeKey);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${
                active ? 'text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/90'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="admin-nav-active"
                  className="absolute inset-0 rounded-xl bg-exeter/25 ring-1 ring-exeter/40"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.45 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4 shrink-0" strokeWidth={1.8} />
              <span className="relative z-10 flex-1">{label}</span>
              {badge > 0 && (
                <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12px] font-medium text-white/45 transition-colors hover:bg-white/5 hover:text-white/80"
        >
          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
          Back to app
        </Link>
      </div>
    </aside>
  );
}
