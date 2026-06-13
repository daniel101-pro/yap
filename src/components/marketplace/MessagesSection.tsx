'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';
import MessageSheet from '@/components/marketplace/MessageSheet';

export default function MessagesSection() {
  const { conversations, setActiveConversation, activeConversation } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (activeConversation) {
      setOpenId(activeConversation);
    }
  }, [activeConversation]);

  const openConversation = (id: string) => {
    setActiveConversation(id);
    setOpenId(id);
  };

  return (
    <section className="mb-8 rounded-2xl bg-surface/45 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Messages ({conversations.length})
        </h3>
      </div>

      {conversations.length === 0 ? (
        <div className="py-6 text-center">
          <MessageCircle className="mx-auto mb-2 h-7 w-7 text-muted" strokeWidth={1.5} />
          <p className="text-[13px] text-muted">No messages yet</p>
          <p className="mt-1 text-[12px] text-muted-light">
            Message a seller from a listing to start chatting
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv, i) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openConversation(conv.id)}
              className="flex w-full items-center gap-3 rounded-xl bg-background/80 px-3 py-3 text-left transition-colors hover:bg-background"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-exeter/10">
                <MessageCircle className="h-4 w-4 text-exeter" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-foreground line-clamp-1">
                  {conv.listingTitle}
                </p>
                <p className="text-[12px] text-muted line-clamp-1 mt-0.5">
                  {conv.lastMessage || 'No messages yet'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-muted-light">
                  {timeAgo(conv.lastMessageTime)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-light" />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {openId && activeConversation && (
          <MessageSheet
            conversationId={activeConversation}
            onClose={() => {
              setOpenId(null);
              setActiveConversation(null);
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
