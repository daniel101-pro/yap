import type { Post, Listing, PostCategory, MarketCategory, Reaction } from '@/types';

const REACTION_WEIGHT: Record<Reaction, number> = {
  fire: 1.35,
  dead: 1.25,
  real: 1.1,
  cap: 0.85,
  sus: 0.9,
};

const CONDITION_MULTIPLIER: Record<Listing['condition'], number> = {
  new: 1.15,
  'like-new': 1.1,
  good: 1,
  fair: 0.92,
};

export interface RankingContext {
  /** Categories the user engages with (from reactions, comments, saves). */
  postCategoryAffinity: Partial<Record<PostCategory, number>>;
  marketCategoryAffinity: Partial<Record<MarketCategory, number>>;
}

/** Derive taste profile from what the user has touched. */
export function buildRankingContext(
  posts: Post[],
  listings: Listing[],
  savedListingIds: string[],
): RankingContext {
  const postCategoryAffinity: Partial<Record<PostCategory, number>> = {};
  const marketCategoryAffinity: Partial<Record<MarketCategory, number>> = {};

  for (const post of posts) {
    if (!post.isOwn) continue;
    postCategoryAffinity[post.category] = (postCategoryAffinity[post.category] ?? 0) + 2;
  }

  for (const post of posts) {
    if (!post.userReaction) continue;
    postCategoryAffinity[post.category] = (postCategoryAffinity[post.category] ?? 0) + 1.5;
  }

  for (const id of savedListingIds) {
    const listing = listings.find((l) => l.id === id);
    if (listing) {
      marketCategoryAffinity[listing.category] =
        (marketCategoryAffinity[listing.category] ?? 0) + 2;
    }
  }

  return { postCategoryAffinity, marketCategoryAffinity };
}

function hoursSince(date: Date): number {
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

/** Reddit-style gravity: fresh posts rise, engagement sustains heat. */
function timeGravity(hoursAge: number, gravity = 1.4): number {
  return 1 / Math.pow(hoursAge + 2, gravity);
}

function postEngagement(post: Post): number {
  let reactionScore = 0;
  for (const [key, count] of Object.entries(post.reactions) as [Reaction, number][]) {
    reactionScore += count * (REACTION_WEIGHT[key] ?? 1);
  }

  const commentScore = post.commentCount * 2.8;
  const pollScore = (post.poll?.totalVotes ?? 0) * 1.6;
  const mediaScore = (post.media?.length ?? 0) > 0 ? 2.5 : 0;
  const pollBoost = post.poll && post.poll.userVote === undefined ? 1.8 : 0;

  return reactionScore + commentScore + pollScore + mediaScore + pollBoost + 1;
}

function postAffinityBoost(
  category: PostCategory,
  affinity: Partial<Record<PostCategory, number>>,
): number {
  const raw = affinity[category] ?? 0;
  return 1 + Math.min(raw * 0.12, 0.45);
}

export function scorePost(post: Post, ctx: RankingContext): number {
  const hours = hoursSince(post.timestamp);
  const engagement = postEngagement(post);
  const gravity = timeGravity(hours, 1.38);
  const affinity = postAffinityBoost(post.category, ctx.postCategoryAffinity);
  const freshnessBurst = hours < 3 ? 1.35 : hours < 12 ? 1.15 : 1;
  const engagedPenalty = post.userReaction ? 0.88 : 1;
  const ownBoost = post.isOwn ? 1.08 : 1;

  return engagement * gravity * affinity * freshnessBurst * engagedPenalty * ownBoost;
}

export function rankPosts(posts: Post[], ctx: RankingContext, searchQuery?: string): Post[] {
  const q = searchQuery?.trim().toLowerCase();

  const scored = posts.map((post) => {
    let score = scorePost(post, ctx);

    if (q) {
      const content = post.content.toLowerCase();
      const pollQ = post.poll?.question?.toLowerCase() ?? '';
      let relevance = 0;
      if (content.includes(q)) relevance += 12;
      if (pollQ.includes(q)) relevance += 10;
      if (post.category.includes(q)) relevance += 6;
      score = relevance > 0 ? relevance * 3 + score * 0.4 : score * 0.15;
    }

    return { post, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return diversifyPosts(scored.map((s) => s.post));
}

/** Avoid six confessions in a row — interleave top categories lightly. */
function diversifyPosts(posts: Post[]): Post[] {
  if (posts.length <= 4) return posts;

  const result: Post[] = [];
  const pool = [...posts];
  let lastCategory: PostCategory | null = null;
  let streak = 0;

  while (pool.length > 0) {
    let pickIndex = 0;
    if (lastCategory && streak >= 2) {
      const alt = pool.findIndex((p) => p.category !== lastCategory);
      if (alt !== -1) pickIndex = alt;
    }
    const [picked] = pool.splice(pickIndex, 1);
    result.push(picked);
    if (picked.category === lastCategory) streak += 1;
    else {
      lastCategory = picked.category;
      streak = 1;
    }
  }

  return result;
}

export function isTrendingPost(post: Post, ctx: RankingContext): boolean {
  const hours = hoursSince(post.timestamp);
  if (hours > 36) return false;
  const engagement = postEngagement(post);
  const score = scorePost(post, ctx);
  return engagement >= 4 && score >= 2.2;
}

function listingEngagement(listing: Listing): number {
  const popularity = Math.log1p(listing.views) * 1.2 + listing.saved * 4.5;
  const photoScore = listing.images.length > 0 ? 3 : -1;
  const condition = CONDITION_MULTIPLIER[listing.condition];
  const sellerScore =
    Math.log1p(listing.seller.totalSales) * 0.8 + Math.log1p(listing.sellerKarma) * 0.15;
  const verified = listing.isVerified ? 1.05 : 1;

  return (popularity + photoScore + sellerScore + 2) * condition * verified;
}

function marketAffinityBoost(
  category: MarketCategory,
  affinity: Partial<Record<MarketCategory, number>>,
): number {
  const raw = affinity[category] ?? 0;
  return 1 + Math.min(raw * 0.14, 0.5);
}

export function scoreListing(listing: Listing, ctx: RankingContext): number {
  if (listing.isSold) return 0;

  const hours = hoursSince(listing.timestamp);
  const gravity = timeGravity(hours, 1.25);
  const engagement = listingEngagement(listing);
  const affinity = marketAffinityBoost(listing.category, ctx.marketCategoryAffinity);
  const freshDeal = hours < 24 ? 1.4 : hours < 72 ? 1.15 : 1;
  const bargainBoost = listing.price > 0 && listing.price < 25 ? 1.08 : 1;

  return engagement * gravity * affinity * freshDeal * bargainBoost;
}

export function rankListings(
  listings: Listing[],
  ctx: RankingContext,
  searchQuery?: string,
): Listing[] {
  const q = searchQuery?.trim().toLowerCase();

  const scored = listings.map((listing) => {
    let score = scoreListing(listing, ctx);

    if (q) {
      const title = listing.title.toLowerCase();
      const desc = listing.description.toLowerCase();
      let relevance = 0;
      if (title.includes(q)) relevance += 15;
      if (title.startsWith(q)) relevance += 8;
      if (desc.includes(q)) relevance += 6;
      if (listing.category.includes(q)) relevance += 5;
      score = relevance > 0 ? relevance * 4 + score * 0.35 : score * 0.1;
    }

    return { listing, score };
  });

  scored.sort((a, b) => {
    if (a.listing.isSold !== b.listing.isSold) {
      return a.listing.isSold ? 1 : -1;
    }
    return b.score - a.score;
  });

  return scored.map((s) => s.listing);
}

export function isFeaturedListing(listing: Listing, ctx: RankingContext): boolean {
  if (listing.isSold) return false;
  const hours = hoursSince(listing.timestamp);
  if (hours > 72) return false;
  return scoreListing(listing, ctx) >= 3.5;
}

export function getTopListings(
  listings: Listing[],
  ctx: RankingContext,
  limit = 4,
): Listing[] {
  return rankListings(listings.filter((l) => !l.isOwn && !l.isSold), ctx).slice(0, limit);
}
