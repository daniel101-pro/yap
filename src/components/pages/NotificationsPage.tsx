'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, Flame, MessageCircle, Heart, Bell, CheckCheck } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import { Notification } from '@/types';

function NotificationIcon({ type }: { type: Notification['type'] }) {
  switch (type) {
    case 'reaction':
      return <Flame className="w-4 h-4 text-orange-400" />;
    case 'comment':
    case 'reply':
      return <MessageCircle className="w-4 h-4 text-blue-400" />;
    case 'listing_saved':
      return <Heart className="w-4 h-4 text-red-400" />;
    case 'listing_sold':
      return <Heart className="w-4 h-4 text-green-400" />;
    case 'system':
      return <Bell className="w-4 h-4 text-exeter" />;
    default:
      return <Bell className="w-4 h-4 text-muted" />;
  }
}

export default function NotificationsPage() {
  const {
    notifications,
    setShowNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    setSelectedPostId,
    setActiveTab,
  } = useStore();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    markNotificationRead(notification.id);
    if (notification.postId) {
      setShowNotifications(false);
      setActiveTab('feed');
      setSelectedPostId(notification.postId);
    }
  };

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-divider">
        <div className="flex items-center justify-between h-14 px-4 max-w-2xl mx-auto">
          <button
            onClick={() => setShowNotifications(false)}
            className="flex items-center gap-1 text-exeter font-medium text-sm"
          >
            <ChevronLeft size={20} />
            <span>Back</span>
          </button>
          <h1 className="font-semibold text-foreground">Notifications</h1>
          {unreadCount > 0 ? (
            <button
              onClick={markAllNotificationsRead}
              className="flex items-center gap-1 text-exeter text-sm font-medium"
            >
              <CheckCheck size={16} />
              <span>Read all</span>
            </button>
          ) : (
            <div className="w-16" />
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center px-5"
          >
            <Bell className="w-8 h-8 text-muted mb-4" strokeWidth={1.5} />
            <p className="text-[14px] font-semibold text-muted">No notifications yet</p>
            <p className="text-[12px] text-muted-light mt-1">
              We&apos;ll notify you when something happens
            </p>
          </motion.div>
        ) : (
          <div className="divide-y divide-divider">
            {notifications.map((notification, index) => (
              <motion.button
                key={notification.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.3 }}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface ${
                  !notification.read ? 'bg-exeter-ghost' : ''
                }`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  !notification.read ? 'bg-exeter/10' : 'bg-surface'
                }`}>
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-[14px] leading-snug ${
                      !notification.read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'
                    }`}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-exeter rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-[13px] text-muted mt-0.5 line-clamp-2">
                    {notification.body}
                  </p>
                  <p className="text-[11px] text-muted-light mt-1.5">
                    {timeAgo(notification.timestamp)}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
