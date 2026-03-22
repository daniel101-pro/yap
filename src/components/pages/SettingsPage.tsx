'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import {
  Moon,
  Sun,
  Bell,
  BellOff,
  Eye,
  EyeOff,
  Shield,
  Info,
  Mail,
  LogOut,
  Trash2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out ${
        enabled ? 'bg-exeter' : 'bg-surface-hover'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out mt-1 ${
          enabled ? 'translate-x-6 ml-0.5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const {
    theme,
    setTheme,
    setShowSettings,
    email,
    logout,
    pushNotificationsEnabled,
    setPushNotificationsEnabled,
    emailNotificationsEnabled,
    setEmailNotificationsEnabled,
    showActivityStatus,
    setShowActivityStatus,
    anonymousByDefault,
    setAnonymousByDefault,
  } = useStore();

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSignOut = () => {
    document.documentElement.classList.remove('dark');
    logout();
  };

  const handleDeleteAccount = () => {
    document.documentElement.classList.remove('dark');
    logout();
  };

  return (
    <>
      <div className="min-h-dvh bg-background text-foreground">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-divider">
          <div className="flex items-center h-14 px-4 max-w-2xl mx-auto">
            <button
              onClick={() => setShowSettings(false)}
              className="flex items-center gap-1 text-exeter font-medium text-sm"
            >
              <ChevronLeft size={20} />
              <span>Profile</span>
            </button>
            <h1 className="flex-1 text-center font-semibold text-foreground">
              Settings
            </h1>
            <div className="w-16" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-8 pb-32">
          {/* Account */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">
              Account
            </h2>
            <div className="rounded-xl bg-surface overflow-hidden divide-y divide-divider">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-muted" />
                  <span className="text-sm text-foreground">Email</span>
                </div>
                <span className="text-sm text-muted">{email || 'user@exeter.ac.uk'}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-muted" />
                  <span className="text-sm text-foreground">University</span>
                </div>
                <span className="text-sm text-muted">University of Exeter</span>
              </div>
            </div>
          </section>

          {/* Appearance */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">
              Appearance
            </h2>
            <div className="rounded-xl bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon size={18} className="text-muted" />
                  ) : (
                    <Sun size={18} className="text-muted" />
                  )}
                  <span className="text-sm text-foreground">Theme</span>
                </div>
                <div className="flex rounded-lg bg-surface-hover p-0.5">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      theme === 'light'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Sun size={14} />
                    Light
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                      theme === 'dark'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    <Moon size={14} />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">
              Notifications
            </h2>
            <div className="rounded-xl bg-surface overflow-hidden divide-y divide-divider">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {pushNotificationsEnabled ? (
                    <Bell size={18} className="text-muted" />
                  ) : (
                    <BellOff size={18} className="text-muted" />
                  )}
                  <span className="text-sm text-foreground">Push Notifications</span>
                </div>
                <ToggleSwitch
                  enabled={pushNotificationsEnabled}
                  onToggle={() => setPushNotificationsEnabled(!pushNotificationsEnabled)}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-muted" />
                  <span className="text-sm text-foreground">Email Notifications</span>
                </div>
                <ToggleSwitch
                  enabled={emailNotificationsEnabled}
                  onToggle={() => setEmailNotificationsEnabled(!emailNotificationsEnabled)}
                />
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">
              Privacy
            </h2>
            <div className="rounded-xl bg-surface overflow-hidden divide-y divide-divider">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {showActivityStatus ? (
                    <Eye size={18} className="text-muted" />
                  ) : (
                    <EyeOff size={18} className="text-muted" />
                  )}
                  <span className="text-sm text-foreground">Show Activity Status</span>
                </div>
                <ToggleSwitch
                  enabled={showActivityStatus}
                  onToggle={() => setShowActivityStatus(!showActivityStatus)}
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-muted" />
                  <span className="text-sm text-foreground">Anonymous by Default</span>
                </div>
                <ToggleSwitch
                  enabled={anonymousByDefault}
                  onToggle={() => setAnonymousByDefault(!anonymousByDefault)}
                />
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2 px-1">
              About
            </h2>
            <div className="rounded-xl bg-surface overflow-hidden divide-y divide-divider">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <Info size={18} className="text-muted" />
                  <span className="text-sm text-foreground">Version</span>
                </div>
                <span className="text-sm text-muted">1.0.0</span>
              </div>
              <button className="flex items-center justify-between px-4 py-3.5 w-full text-left hover:bg-surface-hover transition-colors">
                <span className="text-sm text-foreground">Terms of Service</span>
                <ChevronRight size={16} className="text-muted" />
              </button>
              <button className="flex items-center justify-between px-4 py-3.5 w-full text-left hover:bg-surface-hover transition-colors">
                <span className="text-sm text-foreground">Privacy Policy</span>
                <ChevronRight size={16} className="text-muted" />
              </button>
              <button className="flex items-center justify-between px-4 py-3.5 w-full text-left hover:bg-surface-hover transition-colors">
                <span className="text-sm text-foreground">Contact Support</span>
                <ChevronRight size={16} className="text-muted" />
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2 px-1">
              Danger Zone
            </h2>
            <div className="rounded-xl bg-surface overflow-hidden divide-y divide-divider">
              <button
                onClick={() => setShowSignOutConfirm(true)}
                className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-surface-hover transition-colors"
              >
                <LogOut size={18} className="text-red-500" />
                <span className="text-sm text-red-500 font-medium">Sign Out</span>
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-3 px-4 py-3.5 w-full text-left hover:bg-surface-hover transition-colors"
              >
                <Trash2 size={18} className="text-red-500" />
                <span className="text-sm text-red-500 font-medium">Delete Account</span>
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Sign Out Confirmation */}
      <AnimatePresence>
        {showSignOutConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSignOutConfirm(false)}
              className="fixed inset-0 bg-black/30 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-background border border-divider rounded-2xl p-6 w-[280px] text-center shadow-lg"
            >
              <LogOut className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="text-[16px] font-bold text-foreground mb-2">Sign Out?</h3>
              <p className="text-[13px] text-muted mb-5">You&apos;ll need to verify your email again to get back in.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSignOutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface text-foreground text-[13px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Account Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="fixed inset-0 bg-black/30 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] bg-background border border-divider rounded-2xl p-6 w-[280px] text-center shadow-lg"
            >
              <Trash2 className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="text-[16px] font-bold text-foreground mb-2">Delete Account?</h3>
              <p className="text-[13px] text-muted mb-5">All your yaps and data will be permanently removed. This can&apos;t be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface text-foreground text-[13px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-[13px] font-semibold"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
