'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ImagePlus, ShoppingBag, MessageSquare, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { PostCategory, MarketCategory } from '@/types';
import { getCategoryLabel } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';

const postCategories: PostCategory[] = ['confessions', 'hot-takes', 'questions', 'memes', 'events', 'rants', 'advice'];
const marketCategories: MarketCategory[] = ['textbooks', 'electronics', 'furniture', 'clothing', 'bikes', 'tickets', 'other'];
const conditions = [
  { value: 'new', label: 'Brand New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
] as const;

export default function CreatePostModal() {
  const { showCreateModal, setShowCreateModal, createMode, setCreateMode, addPost, addListing } = useStore();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('confessions');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [marketCategory, setMarketCategory] = useState<MarketCategory>('other');
  const [condition, setCondition] = useState<'new' | 'like-new' | 'good' | 'fair'>('good');

  useEffect(() => {
    if (showCreateModal && createMode === 'post' && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [showCreateModal, createMode]);

  const handleSubmitPost = () => {
    if (!content.trim()) return;
    addPost(content.trim(), category);
    setContent('');
    setShowCreateModal(false);
  };

  const handleSubmitListing = () => {
    if (!title.trim() || !price) return;
    addListing({
      title: title.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category: marketCategory,
      condition,
    });
    setTitle('');
    setDescription('');
    setPrice('');
    setShowCreateModal(false);
  };

  const canSubmit = createMode === 'post' ? content.trim().length > 0 : title.trim().length > 0 && price;
  const charPercent = Math.min((content.length / 500) * 100, 100);

  return (
    <AnimatePresence>
      {showCreateModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380 }}
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-3xl max-h-[92vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--color-background, #FFFFFF)' }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
              <div className="w-9 h-1 rounded-full bg-muted-light" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2 flex-shrink-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--color-surface,#f3f4f6)] transition-colors"
              >
                <X className="w-5 h-5 text-muted" strokeWidth={1.8} />
              </button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={createMode === 'post' ? handleSubmitPost : handleSubmitListing}
                disabled={!canSubmit}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-bold transition-all duration-300 ${
                  canSubmit
                    ? 'bg-exeter text-white shadow-lg shadow-exeter/25'
                    : 'bg-[var(--color-surface-hover,#e5e7eb)] text-muted-light'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                {createMode === 'post' ? 'Yap' : 'List'}
              </motion.button>
            </div>

            {/* Mode Toggle */}
            <div className="px-5 pb-4 flex-shrink-0">
              <div className="flex rounded-2xl p-1" style={{ backgroundColor: 'var(--color-surface, #f3f4f6)' }}>
                <button
                  onClick={() => setCreateMode('post')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                    createMode === 'post'
                      ? 'text-foreground shadow-sm'
                      : 'text-muted'
                  }`}
                  style={createMode === 'post' ? { backgroundColor: 'var(--color-background, #FFFFFF)' } : undefined}
                >
                  <MessageSquare className="w-4 h-4" strokeWidth={2} />
                  Yap
                </button>
                <button
                  onClick={() => setCreateMode('listing')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold transition-all duration-300 ${
                    createMode === 'listing'
                      ? 'text-foreground shadow-sm'
                      : 'text-muted'
                  }`}
                  style={createMode === 'listing' ? { backgroundColor: 'var(--color-background, #FFFFFF)' } : undefined}
                >
                  <ShoppingBag className="w-4 h-4" strokeWidth={2} />
                  Sell
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 pb-8">
              <AnimatePresence mode="wait">
                {createMode === 'post' ? (
                  <motion.div
                    key="post"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Category selector */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {postCategories.map((cat) => {
                        const Icon = getCategoryIcon(cat);
                        const active = category === cat;
                        return (
                          <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 ${
                              active
                                ? 'bg-exeter text-white'
                                : 'text-muted hover:text-foreground'
                            }`}
                            style={!active ? { backgroundColor: 'var(--color-surface, #f3f4f6)' } : undefined}
                          >
                            <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-muted'}`} strokeWidth={1.8} />
                            {getCategoryLabel(cat)}
                          </button>
                        );
                      })}
                    </div>

                    {/* Compose area */}
                    <div className="relative">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: 'var(--color-surface, #f3f4f6)' }}>
                          <Sparkles className="w-4 h-4 text-exeter" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-exeter mb-1.5">Anonymous Yapper</p>
                          <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's happening on campus?"
                            maxLength={500}
                            rows={5}
                            className="w-full resize-none bg-transparent text-[16px] text-foreground leading-[1.7] placeholder:text-muted-light focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--color-divider, #e5e7eb)' }}>
                      <div className="flex items-center gap-2">
                        <button className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-exeter/10 transition-colors">
                          <ImagePlus className="w-[18px] h-[18px] text-exeter" strokeWidth={1.8} />
                        </button>
                        <span className="text-[11px] text-muted-light">Verified student</span>
                      </div>

                      {/* Character ring */}
                      <div className="flex items-center gap-2.5">
                        {content.length > 0 && (
                          <div className="relative w-6 h-6">
                            <svg className="w-6 h-6 -rotate-90" viewBox="0 0 24 24">
                              <circle
                                cx="12" cy="12" r="10"
                                fill="none"
                                stroke="var(--color-divider, #e5e7eb)"
                                strokeWidth="2"
                              />
                              <circle
                                cx="12" cy="12" r="10"
                                fill="none"
                                stroke={content.length > 450 ? '#ef4444' : '#00796B'}
                                strokeWidth="2"
                                strokeDasharray={`${charPercent * 0.628} 62.8`}
                                strokeLinecap="round"
                                className="transition-all duration-300"
                              />
                            </svg>
                            {content.length > 400 && (
                              <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold tabular-nums ${content.length > 450 ? 'text-red-500' : 'text-muted'}`}>
                                {500 - content.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="listing"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6"
                  >
                    {/* Title */}
                    <div>
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 block">What are you selling?</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. MacBook Air M2"
                        maxLength={80}
                        autoFocus
                        className="w-full rounded-xl px-4 py-3.5 text-[16px] font-semibold text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-exeter/30 transition-all"
                        style={{ backgroundColor: 'var(--color-surface, #f3f4f6)' }}
                      />
                    </div>

                    {/* Price */}
                    <div>
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 block">Price</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[22px] font-bold text-foreground">£</span>
                        <input
                          value={price}
                          onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                          placeholder="0"
                          type="text"
                          inputMode="decimal"
                          className="w-full rounded-xl pl-10 pr-4 py-3.5 text-[22px] font-bold text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-exeter/30 transition-all"
                          style={{ backgroundColor: 'var(--color-surface, #f3f4f6)' }}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 block">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your item, condition, pickup location..."
                        rows={3}
                        className="w-full rounded-xl px-4 py-3.5 text-[14px] text-foreground leading-relaxed placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-exeter/30 resize-none transition-all"
                        style={{ backgroundColor: 'var(--color-surface, #f3f4f6)' }}
                      />
                    </div>

                    {/* Condition */}
                    <div>
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5 block">Condition</label>
                      <div className="grid grid-cols-4 gap-2">
                        {conditions.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setCondition(c.value)}
                            className={`py-3 rounded-xl text-[11px] font-bold transition-all duration-200 ${
                              condition === c.value
                                ? 'bg-exeter text-white shadow-sm'
                                : 'text-muted hover:text-foreground'
                            }`}
                            style={condition !== c.value ? { backgroundColor: 'var(--color-surface, #f3f4f6)' } : undefined}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Category */}
                    <div>
                      <label className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2.5 block">Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {marketCategories.map((cat) => {
                          const Icon = getCategoryIcon(cat);
                          const active = marketCategory === cat;
                          return (
                            <button
                              key={cat}
                              onClick={() => setMarketCategory(cat)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold transition-all duration-200 ${
                                active
                                  ? 'bg-exeter text-white'
                                  : 'text-muted hover:text-foreground'
                              }`}
                              style={!active ? { backgroundColor: 'var(--color-surface, #f3f4f6)' } : undefined}
                            >
                              <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-muted'}`} strokeWidth={1.8} />
                              {getCategoryLabel(cat)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
