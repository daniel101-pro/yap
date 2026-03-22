'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, User } from 'lucide-react';
import { useStore } from '@/lib/store';
import { timeAgo } from '@/lib/utils';

interface MessageSheetProps {
  conversationId: string;
  onClose: () => void;
}

export default function MessageSheet({ conversationId, onClose }: MessageSheetProps) {
  const { conversations, sendMessage } = useStore();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  if (!conversation) return null;

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendMessage(conversationId, newMessage.trim());
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 z-[90] rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted-light" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: '1px solid var(--color-divider, #e5e7eb)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-surface, #f3f4f6)', border: '1px solid var(--color-divider, #e5e7eb)' }}>
              <User className="w-4 h-4 text-muted" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">
                {conversation.sellerName}
              </h2>
              <p className="text-[11px] text-muted-light">
                {conversation.listingTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--color-surface, #f3f4f6)' }}
          >
            <X className="w-4 h-4 text-muted" strokeWidth={2} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[200px]">
          {conversation.messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  msg.isOwn
                    ? 'bg-exeter text-white rounded-br-md'
                    : 'text-foreground rounded-bl-md'
                }`}
                style={!msg.isOwn ? { backgroundColor: 'var(--color-surface, #f3f4f6)' } : undefined}
              >
                <p className="text-[14px] leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${
                  msg.isOwn ? 'text-white/50' : 'text-muted-light'
                }`}>
                  {timeAgo(msg.timestamp)}
                </p>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-3 flex-shrink-0"
          style={{
            borderTop: '1px solid var(--color-divider, #e5e7eb)',
            backgroundColor: 'var(--color-background, #FFFFFF)',
          }}
        >
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 rounded-full px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-exeter/30"
              style={{ backgroundColor: 'var(--color-surface, #f3f4f6)' }}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!newMessage.trim()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                newMessage.trim()
                  ? 'bg-exeter text-white'
                  : 'text-muted-light'
              }`}
              style={!newMessage.trim() ? { backgroundColor: 'var(--color-surface-hover, #e5e7eb)' } : undefined}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
