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
} from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/posts', label: 'Posts', icon: MessageSquare },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/listings', label: 'Listings', icon: ShoppingBag },
  { href: '/admin/nightlife', label: 'Nightlife', icon: PartyPopper },
  { href: '/admin/reports', label: 'Reports', icon: Flag },
  { href: '/admin/conversations', label: 'Conversations', icon: Mail },
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

  useEffect(() => {
    setIsDark(resolveIsDark());
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    window.localStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  return (
    <aside className="flex h-dvh w-56 flex-shrink-0 flex-col border-r border-divider bg-surface/40 px-3 py-5">
      <div className="mb-6 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-exeter text-[13px] font-bold text-white">
            Y
          </div>
          <span className="text-[14px] font-bold text-foreground">Admin</span>
        </div>
        <button
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-foreground"
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

      <nav className="flex-1 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? 'text-exeter' : 'text-muted hover:bg-surface hover:text-foreground'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="admin-nav-active"
                  className="absolute inset-0 rounded-lg bg-exeter/10"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                />
              )}
              <Icon className="relative z-10 h-4 w-4" strokeWidth={1.8} />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>

      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-muted-light transition-colors hover:bg-surface hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
        Back to app
      </Link>
    </aside>
  );
}
