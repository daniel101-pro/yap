'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share, Plus, X, Smartphone } from 'lucide-react';
import { markInstallPromptSeen, useInstallPrompt } from '@/hooks/useInstallPrompt';

interface InstallAppPromptProps {
  userId: string | undefined;
  ready: boolean;
}

export default function InstallAppPrompt({ userId, ready }: InstallAppPromptProps) {
  const { shouldOffer, canInstallNative, triggerInstall, isIOSDevice } = useInstallPrompt(
    userId,
    ready,
  );
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (!shouldOffer) return;
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, [shouldOffer]);

  const dismiss = () => {
    if (userId) markInstallPromptSeen(userId);
    setOpen(false);
  };

  const handleInstall = async () => {
    if (canInstallNative) {
      setInstalling(true);
      const accepted = await triggerInstall();
      setInstalling(false);
      if (accepted || userId) {
        if (userId) markInstallPromptSeen(userId);
        setOpen(false);
      }
      return;
    }
    dismiss();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
            className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className="fixed inset-x-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-[90] mx-auto max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl ring-1 ring-divider"
          >
            <button
              type="button"
              onClick={dismiss}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted"
              aria-label="Close"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>

            <div className="px-6 pt-8 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F172A] shadow-[0_8px_24px_rgba(0,121,107,0.25)] ring-2 ring-exeter/30">
                <span className="text-[32px] font-black text-white">Y</span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-exeter">
                One-time setup
              </p>
              <h2 className="mt-2 text-[22px] font-black tracking-tight text-foreground">
                Add YAP to your home screen
              </h2>
            </div>

            {isIOSDevice && !canInstallNative ? (
              <div className="mx-6 mb-6 space-y-3 rounded-2xl bg-surface/80 p-4 text-left ring-1 ring-divider">
                <p className="text-[12px] font-bold uppercase tracking-wide text-muted">
                  On iPhone
                </p>
                <ol className="space-y-3 text-[13px] text-foreground">
                  <li className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-exeter/10 text-exeter">
                      <Share className="h-4 w-4" strokeWidth={2} />
                    </span>
                    Tap <strong>Share</strong> at the bottom of Safari
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-exeter/10 text-exeter">
                      <Plus className="h-4 w-4" strokeWidth={2} />
                    </span>
                    Scroll and tap <strong>Add to Home Screen</strong>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-exeter/10 text-exeter">
                      <Smartphone className="h-4 w-4" strokeWidth={2} />
                    </span>
                    Tap <strong>Add</strong>. YAP lands on your home screen.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="mx-6 mb-6 flex items-center gap-3 rounded-2xl bg-surface/80 p-4 ring-1 ring-divider">
                <Download className="h-8 w-8 shrink-0 text-exeter" strokeWidth={2} />
                <p className="text-[13px] leading-snug text-muted">
                  {canInstallNative
                    ? 'Tap below and confirm when your phone asks to install YAP.'
                    : 'Use your browser menu → Install app or Add to Home screen.'}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 border-t border-divider px-6 py-4">
              {canInstallNative ? (
                <button
                  type="button"
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full rounded-2xl bg-exeter py-3.5 text-[15px] font-bold text-white shadow-[0_4px_20px_rgba(0,121,107,0.35)] disabled:opacity-60"
                >
                  {installing ? 'Installing…' : 'Add YAP to home screen'}
                </button>
              ) : isIOSDevice ? (
                <button
                  type="button"
                  onClick={dismiss}
                  className="w-full rounded-2xl bg-exeter py-3.5 text-[15px] font-bold text-white"
                >
                  Got it
                </button>
              ) : null}
              <button
                type="button"
                onClick={dismiss}
                className="w-full py-2.5 text-[13px] font-medium text-muted"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
