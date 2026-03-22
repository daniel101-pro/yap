'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ChevronDown, ShoppingBag, MessageSquare } from 'lucide-react';
import { useStore } from '@/lib/store';
import { PostCategory, MarketCategory } from '@/types';
import { getCategoryLabel } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/icons';

const postCategories: PostCategory[] = ['confessions', 'hot-takes', 'questions', 'memes', 'events', 'rants', 'advice'];
const marketCategories: MarketCategory[] = ['textbooks', 'electronics', 'furniture', 'clothing', 'bikes', 'tickets', 'other'];
const conditions = [
  { value: 'new', label: 'New' },
  { value: 'like-new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
] as const;

function CategoryIconInline({ category, className }: { category: string; className?: string }) {
  const Icon = getCategoryIcon(category);
  return <Icon className={className || 'w-4 h-4'} strokeWidth={1.8} aria-hidden="true" />;
}

export default function CreatePostModal() {
  const { showCreateModal, setShowCreateModal, createMode, setCreateMode, addPost, addListing } = useStore();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<PostCategory>('confessions');
  const [showCategories, setShowCategories] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [marketCategory, setMarketCategory] = useState<MarketCategory>('other');
  const [condition, setCondition] = useState<'new' | 'like-new' | 'good' | 'fair'>('good');

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

  return (
    <AnimatePresence>
      {showCreateModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowCreateModal(false)}
            className="fixed inset-0 bg-black/30 z-[60]"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-surface rounded-t-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="w-9 h-1 rounded-full bg-muted-light" />
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between py-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 -ml-1.5 rounded-full hover:bg-surface-hover transition-colors"
                >
                  <X className="w-5 h-5 text-muted" strokeWidth={1.8} />
                </button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={createMode === 'post' ? handleSubmitPost : handleSubmitListing}
                  disabled={!canSubmit}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 ${
                    canSubmit
                      ? 'bg-exeter text-white'
                      : 'bg-surface-hover text-muted-light'
                  }`}
                >
                  <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Post
                </motion.button>
              </div>

              {/* Mode Toggle */}
              <div className="flex bg-surface-hover rounded-xl p-0.5 mb-6">
                <button
                  onClick={() => setCreateMode('post')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-300 ${
                    createMode === 'post'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" strokeWidth={1.8} />
                  Yap
                </button>
                <button
                  onClick={() => setCreateMode('listing')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-semibold transition-all duration-300 ${
                    createMode === 'listing'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" strokeWidth={1.8} />
                  Sell
                </button>
              </div>

              <AnimatePresence mode="wait">
                {createMode === 'post' ? (
                  <motion.div
                    key="post"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Category */}
                    <button
                      onClick={() => setShowCategories(!showCategories)}
                      className="flex items-center gap-2 px-3.5 py-2 bg-surface-hover rounded-full mb-5 text-[13px] font-medium text-foreground"
                    >
                      <CategoryIconInline category={category} className="w-3.5 h-3.5 text-exeter" />
                      <span>{getCategoryLabel(category)}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${showCategories ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {showCategories && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden mb-5"
                        >
                          <div className="flex flex-wrap gap-1.5 pb-1">
                            {postCategories.map((cat) => (
                              <button
                                key={cat}
                                onClick={() => { setCategory(cat); setShowCategories(false); }}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                                  category === cat
                                    ? 'bg-exeter text-white'
                                    : 'bg-surface-hover text-muted hover:text-foreground'
                                }`}
                              >
                                <CategoryIconInline category={cat} className={`w-3.5 h-3.5 ${category === cat ? 'text-white' : 'text-muted'}`} />
                                {getCategoryLabel(cat)}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="What's on your mind?"
                      maxLength={500}
                      rows={6}
                      autoFocus
                      className="w-full resize-none bg-transparent text-[16px] text-foreground leading-relaxed placeholder:text-muted-light focus:outline-none"
                    />
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-divider">
                      <p className="text-[11px] text-muted-light">Anonymous · verified student</p>
                      <p className={`text-[11px] tabular-nums ${content.length > 450 ? 'text-red-400' : 'text-muted-light'}`}>
                        {content.length}/500
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="listing"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What are you selling?"
                      maxLength={80}
                      autoFocus
                      className="w-full bg-transparent text-[20px] font-semibold text-foreground placeholder:text-muted-light focus:outline-none"
                    />

                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[28px] font-bold text-foreground">£</span>
                      <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                        placeholder="0"
                        type="text"
                        inputMode="decimal"
                        className="w-full bg-transparent pl-7 text-[28px] font-bold text-foreground placeholder:text-muted-light focus:outline-none"
                      />
                    </div>

                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your item..."
                      rows={3}
                      className="w-full resize-none bg-transparent text-[15px] text-foreground leading-relaxed placeholder:text-muted-light focus:outline-none border-t border-divider pt-4"
                    />

                    <div>
                      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5 block">Condition</label>
                      <div className="flex gap-1.5">
                        {conditions.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setCondition(c.value)}
                            className={`flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all duration-200 ${
                              condition === c.value
                                ? 'bg-exeter text-white'
                                : 'bg-surface-hover text-muted hover:text-foreground'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2.5 block">Category</label>
                      <div className="flex flex-wrap gap-1.5">
                        {marketCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setMarketCategory(cat)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-medium transition-all duration-200 ${
                              marketCategory === cat
                                ? 'bg-exeter text-white'
                                : 'bg-surface-hover text-muted hover:text-foreground'
                            }`}
                          >
                            <CategoryIconInline category={cat} className={`w-3.5 h-3.5 ${marketCategory === cat ? 'text-white' : 'text-muted'}`} />
                            {getCategoryLabel(cat)}
                          </button>
                        ))}
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
