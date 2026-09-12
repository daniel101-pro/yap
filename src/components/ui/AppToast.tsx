'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X } from 'lucide-react';

export interface ToastState {
  message: string;
  type?: 'success' | 'error';
}

export default function AppToast({
  toast,
  onDismiss,
}: {
  toast: ToastState | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.95 }}
          className="fixed left-1/2 top-20 z-[100] w-[min(360px,calc(100vw-32px))] -translate-x-1/2"
        >
          <div
            className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 shadow-xl ring-1 ${
              toast.type === 'error'
                ? 'bg-red-500/10 ring-red-500/25 text-red-600 dark:text-red-400'
                : 'bg-background ring-divider text-foreground'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-exeter" strokeWidth={2} />
            )}
            <p className="flex-1 text-[13px] font-medium leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 text-muted hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
