import { create } from 'zustand';
import { Post, Listing, Reaction, PostCategory, MarketCategory } from '@/types';
import { mockPosts, mockListings } from './mock-data';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  email: string;
  setEmail: (email: string) => void;
  login: () => void;

  // Feed
  posts: Post[];
  feedFilter: PostCategory | 'all';
  setFeedFilter: (filter: PostCategory | 'all') => void;
  reactToPost: (postId: string, reaction: Reaction) => void;
  addPost: (content: string, category: PostCategory) => void;

  // Marketplace
  listings: Listing[];
  marketFilter: MarketCategory | 'all';
  setMarketFilter: (filter: MarketCategory | 'all') => void;
  addListing: (listing: Omit<Listing, 'id' | 'timestamp' | 'isVerified' | 'isSold' | 'sellerKarma' | 'images' | 'seller' | 'reviews' | 'views' | 'saved'>) => void;

  // Listing detail
  selectedListing: Listing | null;
  setSelectedListing: (listing: Listing | null) => void;
  selectedSellerId: string | null;
  setSelectedSellerId: (id: string | null) => void;

  // UI
  activeTab: 'feed' | 'market' | 'create' | 'profile';
  setActiveTab: (tab: 'feed' | 'market' | 'create' | 'profile') => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  createMode: 'post' | 'listing';
  setCreateMode: (mode: 'post' | 'listing') => void;
}

export const useStore = create<AppState>((set) => ({
  isAuthenticated: false,
  email: '',
  setEmail: (email) => set({ email }),
  login: () => set({ isAuthenticated: true }),

  posts: mockPosts,
  feedFilter: 'all',
  setFeedFilter: (filter) => set({ feedFilter: filter }),
  reactToPost: (postId, reaction) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post;
        const prev = post.userReaction;
        const reactions = { ...post.reactions };
        if (prev) reactions[prev] = Math.max(0, reactions[prev] - 1);
        if (prev !== reaction) {
          reactions[reaction] = reactions[reaction] + 1;
          return { ...post, reactions, userReaction: reaction };
        }
        return { ...post, reactions, userReaction: null };
      }),
    })),
  addPost: (content, category) =>
    set((state) => ({
      posts: [
        {
          id: `p${Date.now()}`,
          content,
          category,
          reactions: { fire: 0, cap: 0, dead: 0, real: 0, sus: 0 },
          commentCount: 0,
          timestamp: new Date(),
          isVerified: true,
        },
        ...state.posts,
      ],
    })),

  listings: mockListings,
  marketFilter: 'all',
  setMarketFilter: (filter) => set({ marketFilter: filter }),
  addListing: (listing) =>
    set((state) => ({
      listings: [
        {
          ...listing,
          id: `l${Date.now()}`,
          timestamp: new Date(),
          isVerified: true,
          isSold: false,
          sellerKarma: 0,
          images: [],
          seller: { id: 'self', name: 'You', rating: 5, totalSales: 0, joinDate: new Date() },
          reviews: [],
          views: 0,
          saved: 0,
        },
        ...state.listings,
      ],
    })),

  selectedListing: null,
  setSelectedListing: (listing) => set({ selectedListing: listing }),
  selectedSellerId: null,
  setSelectedSellerId: (id) => set({ selectedSellerId: id }),

  activeTab: 'feed',
  setActiveTab: (tab) => set({ activeTab: tab }),
  showCreateModal: false,
  setShowCreateModal: (show) => set({ showCreateModal: show }),
  createMode: 'post',
  setCreateMode: (mode) => set({ createMode: mode }),
}));
