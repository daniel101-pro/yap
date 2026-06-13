'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Compass } from 'lucide-react';

function applyStoredTheme() {
  const saved = window.localStorage.getItem('theme-preference');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (saved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.toggle('dark', prefersDark);
  }
}

export default function NotFoundPage() {
  useEffect(() => {
    applyStoredTheme();
  }, []);

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full bg-exeter/20 blur-[100px] dark:bg-exeter/15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 right-0 h-[280px] w-[280px] rounded-full bg-exeter/10 blur-[80px] dark:bg-exeter/8"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-lg flex-col px-6 py-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between"
        >
          <Link
            href="/"
            className="text-[20px] font-black tracking-tight text-foreground"
          >
            Y_
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            Back
          </Link>
        </motion.header>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8"
          >
            <div className="relative inline-flex items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-exeter/10 blur-2xl"
                aria-hidden
              />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-surface shadow-[0_8px_32px_rgba(0,121,107,0.12)] ring-1 ring-divider dark:shadow-[0_8px_32px_rgba(0,121,107,0.08)]">
                <Compass className="h-10 w-10 text-exeter" strokeWidth={1.5} />
              </div>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-[72px] font-black leading-none tracking-tighter text-gradient"
          >
            404
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="mt-4 text-[22px] font-bold tracking-tight text-foreground"
          >
            Page not found
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-3 max-w-[280px] text-[15px] leading-relaxed text-muted"
          >
            This URL wandered off campus. Maybe it&apos;s at a house party without you.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-10 flex flex-col gap-3 w-full max-w-xs"
          >
            <Link
              href="/"
              className="flex items-center justify-center gap-2 rounded-full bg-exeter px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(0,121,107,0.35)] transition-all hover:bg-exeter-light active:scale-[0.98]"
            >
              <Home className="h-4 w-4" strokeWidth={2} />
              Back to YAP
            </Link>
            <Link
              href="/"
              className="rounded-full px-6 py-3.5 text-[14px] font-medium text-muted transition-colors hover:text-foreground"
            >
              Or head to the feed
            </Link>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.6 }}
          className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-muted-light"
        >
          University of Exeter · Verified only
        </motion.p>
      </div>
    </div>
  );
}
