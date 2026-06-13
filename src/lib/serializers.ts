import type {
  Post,
  Listing,
  NightlifeTicket,
  NightlifePin,
  Notification,
  Comment,
  Reaction,
  PostCategory,
  MarketCategory,
} from '@/types';
import type {
  Post as DbPost,
  PostReaction,
  PollVote,
  Comment as DbComment,
  Listing as DbListing,
  User,
  NightlifeTicket as DbTicket,
  NightlifePin as DbPin,
  Notification as DbNotification,
} from '@prisma/client';
import { parseJson } from '@/lib/json';

const REACTIONS: Reaction[] = ['fire', 'cap', 'dead', 'real', 'sus'];

type PostRow = DbPost & {
  reactions?: PostReaction[];
  pollVotes?: PollVote[];
  _count?: { comments: number };
};

export function serializePost(post: PostRow, userId?: string): Post {
  const reactions = Object.fromEntries(REACTIONS.map((r) => [r, 0])) as Record<Reaction, number>;
  for (const r of post.reactions ?? []) {
    if (REACTIONS.includes(r.reaction as Reaction)) {
      reactions[r.reaction as Reaction] += 1;
    }
  }

  const userReaction = post.reactions?.find((r) => r.userId === userId)?.reaction as Reaction | undefined;
  const pollOptions = parseJson<{ id: number; text: string; votes: number }[]>(post.pollOptions, []);
  const userVote = post.pollVotes?.find((v) => v.userId === userId)?.optionId;

  return {
    id: post.id,
    content: post.content,
    category: post.category as PostCategory,
    reactions,
    userReaction: userReaction ?? null,
    commentCount: post._count?.comments ?? 0,
    timestamp: post.createdAt,
    isVerified: true,
    isOwn: userId ? post.authorId === userId : false,
    media: parseJson(post.media, []),
    poll: post.pollQuestion
      ? {
          question: post.pollQuestion,
          options: pollOptions,
          totalVotes: post.pollTotalVotes,
          userVote,
        }
      : undefined,
  };
}

export function serializeComment(
  comment: DbComment & { replies?: DbComment[] },
  userId?: string,
  postAuthorId?: string,
): Comment {
  return {
    id: comment.id,
    postId: comment.postId,
    content: comment.content,
    timestamp: comment.createdAt,
    upvotes: comment.upvotes,
    isOP: comment.authorId === postAuthorId,
    replies: (comment.replies ?? []).map((r) => serializeComment(r, userId, postAuthorId)),
  };
}

export function serializeListing(
  listing: DbListing & { seller: User; _count?: { saves: number } },
): Listing {
  const sellerName = listing.seller.anonymousHandle ?? 'Anonymous';
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    category: listing.category as MarketCategory,
    images: parseJson<string[]>(listing.images, []),
    condition: listing.condition as Listing['condition'],
    timestamp: listing.createdAt,
    isVerified: true,
    isSold: listing.isSold,
    sellerKarma: listing.seller.karma,
    seller: {
      id: listing.seller.id,
      name: sellerName,
      rating: 5,
      totalSales: 0,
      joinDate: listing.seller.createdAt,
    },
    reviews: [],
    views: listing.views,
    saved: listing._count?.saves ?? 0,
  };
}

export function serializeTicket(
  ticket: DbTicket & { seller: User },
): NightlifeTicket {
  return {
    id: ticket.id,
    title: ticket.title,
    venue: ticket.venue,
    price: ticket.price,
    eventDate: ticket.eventDate,
    sellerName: ticket.seller.anonymousHandle ?? 'You',
    sellerStripeAccountId: ticket.sellerStripeAccountId ?? undefined,
    quantity: ticket.quantity,
    status: ticket.status as NightlifeTicket['status'],
    isSold: ticket.status === 'sold',
  };
}

export function serializePin(pin: DbPin): NightlifePin {
  return {
    id: pin.id,
    name: pin.name,
    type: pin.type as NightlifePin['type'],
    address: pin.address,
    mapsQuery: pin.mapsQuery,
    lat: pin.lat,
    lng: pin.lng,
    isOpen: pin.isOpen,
  };
}

export function serializeNotification(n: DbNotification): Notification {
  return {
    id: n.id,
    type: n.type as Notification['type'],
    title: n.title,
    body: n.body,
    timestamp: n.createdAt,
    read: n.read,
    postId: n.postId ?? undefined,
    listingId: n.listingId ?? undefined,
  };
}
