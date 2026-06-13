'use client';

import { useMemo } from 'react';
import { useStore } from '@/lib/store';
import {
  buildRankingContext,
  rankPosts,
  rankListings,
  isTrendingPost,
  getTopListings,
  type RankingContext,
} from '@/lib/feed-ranking';

export function useRankingContext(): RankingContext {
  const posts = useStore((s) => s.posts);
  const listings = useStore((s) => s.listings);
  const savedListings = useStore((s) => s.savedListings);

  return useMemo(
    () => buildRankingContext(posts, listings, savedListings),
    [posts, listings, savedListings],
  );
}

export function useRankedFeed(
  feedFilter: 'all' | string,
  searchQuery: string,
) {
  const posts = useStore((s) => s.posts);
  const ctx = useRankingContext();

  return useMemo(() => {
    let pool = feedFilter === 'all' ? posts : posts.filter((p) => p.category === feedFilter);
    return rankPosts(pool, ctx, searchQuery);
  }, [posts, feedFilter, searchQuery, ctx]);
}

export function usePostTrending(postId: string): boolean {
  const posts = useStore((s) => s.posts);
  const ctx = useRankingContext();
  const post = posts.find((p) => p.id === postId);
  if (!post) return false;
  return isTrendingPost(post, ctx);
}

export function useRankedMarketplace(
  marketFilter: 'all' | string,
  searchQuery: string,
  excludeOwn = true,
) {
  const listings = useStore((s) => s.listings);
  const ctx = useRankingContext();

  return useMemo(() => {
    let pool = marketFilter === 'all'
      ? listings
      : listings.filter((l) => l.category === marketFilter);
    if (excludeOwn) pool = pool.filter((l) => !l.isOwn);
    return rankListings(pool, ctx, searchQuery);
  }, [listings, marketFilter, searchQuery, excludeOwn, ctx]);
}

export function useFeaturedListings(limit = 4) {
  const listings = useStore((s) => s.listings);
  const ctx = useRankingContext();

  return useMemo(
    () => getTopListings(listings, ctx, limit),
    [listings, ctx, limit],
  );
}
