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
import { isAllowedMediaUrl } from '@/lib/validation';
import { fuzzLatLng } from '@/lib/pin-privacy';

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
    media: parseJson<{ type: 'image' | 'video'; url: string }[]>(post.media, []).filter(
      (item) => item && isAllowedMediaUrl(item.url),
    ),
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
  listing: DbListing & {
    seller: User & { _count?: { listings: number } };
    _count?: { saves: number };
  },
  userId?: string,
): Listing {
  const sellerName = listing.seller.anonymousHandle ?? 'Anonymous';
  const totalSales = listing.seller._count?.listings ?? 0;
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    category: listing.category as MarketCategory,
    images: parseJson<string[]>(listing.images, []).filter(isAllowedMediaUrl),
    condition: listing.condition as Listing['condition'],
    timestamp: listing.createdAt,
    isVerified: true,
    isSold: listing.isSold,
    isOwn: userId ? listing.sellerId === userId : false,
    sellerKarma: listing.seller.karma,
    seller: {
      handle: sellerName,
      name: sellerName,
      rating: 5,
      totalSales,
      joinDate: listing.seller.createdAt,
    },
    reviews: [],
    views: listing.views,
    saved: listing._count?.saves ?? 0,
  };
}

export function serializeTicket(
  ticket: DbTicket & { seller: { anonymousHandle: string | null } },
): NightlifeTicket {
  return {
    id: ticket.id,
    title: ticket.title,
    venue: ticket.venue,
    price: ticket.price,
    eventDate: ticket.eventDate,
    sellerName: ticket.seller.anonymousHandle ?? 'You',
    quantity: ticket.quantity,
    status: ticket.status as NightlifeTicket['status'],
    isSold: ticket.status === 'sold',
  };
}

export function serializePin(pin: DbPin, viewerId?: string): NightlifePin {
  const isOwn = Boolean(viewerId && pin.createdById && pin.createdById === viewerId);
  const isHouseParty = pin.type === 'house-party';
  const shouldFuzz = isHouseParty && !isOwn;
  const coords = shouldFuzz ? fuzzLatLng(pin.lat, pin.lng, pin.id) : { lat: pin.lat, lng: pin.lng };

  return {
    id: pin.id,
    name: pin.name,
    type: pin.type as NightlifePin['type'],
    address: pin.address,
    mapsQuery: pin.mapsQuery,
    lat: coords.lat,
    lng: coords.lng,
    isOpen: pin.isOpen,
    isApproximate: shouldFuzz,
    isOwn,
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
