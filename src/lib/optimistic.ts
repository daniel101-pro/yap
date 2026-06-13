import type { Post, Reaction } from '@/types';

export function applyOptimisticReaction(post: Post, reaction: Reaction): Post {
  const reactions = { ...post.reactions };
  const current = post.userReaction;

  if (current === reaction) {
    reactions[reaction] = Math.max(0, reactions[reaction] - 1);
    return { ...post, reactions, userReaction: null };
  }

  if (current) {
    reactions[current] = Math.max(0, reactions[current] - 1);
  }
  reactions[reaction] = reactions[reaction] + 1;
  return { ...post, reactions, userReaction: reaction };
}
