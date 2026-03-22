'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ChevronUp, CornerDownRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { Comment } from '@/types';
import { useStore } from '@/lib/store';
import { timeAgo, formatNumber } from '@/lib/utils';

interface CommentSheetProps {
  postId: string;
  onClose: () => void;
}

function CommentItem({
  comment,
  postId,
  depth = 0,
  onReply,
}: {
  comment: Comment;
  postId: string;
  depth?: number;
  onReply: (commentId: string) => void;
}) {
  const { upvoteComment } = useStore();
  const [upvoted, setUpvoted] = useState(false);

  const handleUpvote = () => {
    if (upvoted) return;
    setUpvoted(true);
    upvoteComment(postId, comment.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={depth > 0 ? 'ml-8 mt-2' : ''}
    >
      <div className="py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[12px] font-semibold ${comment.isOP ? 'text-exeter' : 'text-foreground/70'}`}>
                {comment.isOP ? 'OP' : 'Anonymous'}
              </span>
              {comment.isOP && (
                <span className="text-[10px] px-1.5 py-0.5 bg-exeter/10 text-exeter rounded-full font-medium">
                  OP
                </span>
              )}
              <span className="text-[11px] text-muted-light">
                {timeAgo(comment.timestamp)}
              </span>
            </div>
            <p className="text-[14px] text-foreground/90 leading-relaxed">
              {comment.content}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={handleUpvote}
            className={`flex items-center gap-1 text-[12px] transition-colors ${
              upvoted ? 'text-exeter font-semibold' : 'text-muted-light hover:text-foreground'
            }`}
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span className="tabular-nums">{comment.upvotes + (upvoted ? 1 : 0)}</span>
          </button>
          {depth === 0 && (
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 text-[12px] text-muted-light hover:text-foreground transition-colors"
            >
              <CornerDownRight className="w-3 h-3" />
              Reply
            </button>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies.length > 0 && (
        <div className="border-l-2 border-divider pl-0">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              depth={depth + 1}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function CommentSheet({ postId, onClose }: CommentSheetProps) {
  const { comments, addComment, posts } = useStore();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const postComments = comments[postId] || [];
  const post = posts.find((p) => p.id === postId);

  useEffect(() => {
    if (replyingTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addComment(postId, newComment.trim(), replyingTo || undefined);
    setNewComment('');
    setReplyingTo(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
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
        className="fixed inset-0 bg-black/30 z-[60]"
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
        className="fixed bottom-0 left-0 right-0 z-[70] bg-background rounded-t-3xl max-h-[85vh] flex flex-col"
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="w-9 h-1 rounded-full bg-muted-light" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-divider">
          <h2 className="text-[16px] font-bold text-foreground">
            Comments ({post?.commentCount || 0})
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5 text-muted" strokeWidth={1.8} />
          </button>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {postComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[14px] font-semibold text-muted">No comments yet</p>
              <p className="text-[12px] text-muted-light mt-1">Be the first to comment</p>
            </div>
          ) : (
            <div className="divide-y divide-divider">
              {postComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  postId={postId}
                  onReply={(id) => setReplyingTo(id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reply indicator */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 overflow-hidden"
            >
              <div className="flex items-center justify-between py-2 text-[12px] text-exeter">
                <span className="flex items-center gap-1.5">
                  <CornerDownRight className="w-3 h-3" />
                  Replying to comment
                </span>
                <button onClick={() => setReplyingTo(null)} className="text-muted-light hover:text-foreground">
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-5 py-3 border-t border-divider bg-background">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
              className="flex-1 bg-surface rounded-full px-4 py-2.5 text-[14px] text-foreground placeholder:text-muted-light focus:outline-none focus:ring-2 focus:ring-exeter/30"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSubmit}
              disabled={!newComment.trim()}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                newComment.trim()
                  ? 'bg-exeter text-white'
                  : 'bg-surface-hover text-muted-light'
              }`}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
