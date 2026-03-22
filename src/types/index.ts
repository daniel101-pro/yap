export type PostCategory = 'confessions' | 'hot-takes' | 'questions' | 'memes' | 'events' | 'rants' | 'advice';

export type MarketCategory = 'textbooks' | 'electronics' | 'furniture' | 'clothing' | 'bikes' | 'tickets' | 'other';

export type Reaction = 'fire' | 'cap' | 'dead' | 'real' | 'sus';

export interface Post {
  id: string;
  content: string;
  category: PostCategory;
  reactions: Record<Reaction, number>;
  userReaction?: Reaction | null;
  commentCount: number;
  timestamp: Date;
  isVerified: boolean;
  poll?: Poll;
  imageUrl?: string;
  media?: { type: 'image' | 'video'; url: string }[];
}

export interface Poll {
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVote?: number;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface Comment {
  id: string;
  postId: string;
  content: string;
  timestamp: Date;
  upvotes: number;
  replies: Comment[];
  isOP: boolean;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  timestamp: Date;
  buyerName: string;
}

export interface Seller {
  id: string;
  name: string;
  rating: number;
  totalSales: number;
  joinDate: Date;
  listings: string[];
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: MarketCategory;
  images: string[];
  condition: 'new' | 'like-new' | 'good' | 'fair';
  timestamp: Date;
  isVerified: boolean;
  isSold: boolean;
  sellerKarma: number;
  seller: { id: string; name: string; avatar?: string; rating: number; totalSales: number; joinDate: Date };
  reviews: Review[];
  views: number;
  saved: number;
}

export interface UserProfile {
  karma: number;
  postCount: number;
  joinDate: Date;
  isVerified: boolean;
  university: string;
}

export interface Notification {
  id: string;
  type: 'reaction' | 'comment' | 'reply' | 'listing_saved' | 'listing_sold' | 'system';
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
  postId?: string;
  listingId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  isOwn: boolean;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  sellerId: string;
  sellerName: string;
  messages: Message[];
  lastMessage: string;
  lastMessageTime: Date;
  unread: number;
}
