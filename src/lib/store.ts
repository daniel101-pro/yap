import { create } from 'zustand';
import { Post, Listing, Reaction, PostCategory, MarketCategory, Comment, Notification, Conversation, Message, NightlifeTicket, NightlifePin } from '@/types';
import { mockPosts, mockListings, allMockComments, mockNotifications } from './mock-data';

interface AppState {
  // Auth
  isAuthenticated: boolean;
  email: string;
  setEmail: (email: string) => void;
  login: () => void;
  logout: () => void;

  // Feed
  posts: Post[];
  feedFilter: PostCategory | 'all';
  setFeedFilter: (filter: PostCategory | 'all') => void;
  reactToPost: (postId: string, reaction: Reaction) => void;
  addPost: (content: string, category: PostCategory, media?: Post['media']) => void;
  deletePost: (postId: string) => void;
  voteOnPoll: (postId: string, optionId: number) => void;

  // Comments
  comments: Record<string, Comment[]>;
  addComment: (postId: string, content: string, parentCommentId?: string) => void;
  upvoteComment: (postId: string, commentId: string) => void;

  // Marketplace
  listings: Listing[];
  marketFilter: MarketCategory | 'all';
  setMarketFilter: (filter: MarketCategory | 'all') => void;
  addListing: (listing: Omit<Listing, 'id' | 'timestamp' | 'isVerified' | 'isSold' | 'sellerKarma' | 'seller' | 'reviews' | 'views' | 'saved'>) => void;
  savedListings: string[];
  toggleSaveListing: (listingId: string) => void;

  // Nightlife
  nightlifeTickets: NightlifeTicket[];
  addNightlifeTicket: (ticket: Omit<NightlifeTicket, 'id' | 'sellerName' | 'isSold'>) => void;
  nightlifePins: NightlifePin[];
  addNightlifePin: (pin: Omit<NightlifePin, 'id'>) => void;

  // Listing detail
  selectedListing: Listing | null;
  setSelectedListing: (listing: Listing | null) => void;
  selectedSellerId: string | null;
  setSelectedSellerId: (id: string | null) => void;

  // Conversations / Messages
  conversations: Conversation[];
  activeConversation: string | null;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string) => void;
  startConversation: (listing: Listing) => string;

  // Notifications
  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadNotificationCount: () => number;

  // UI
  activeTab: 'feed' | 'market' | 'nightlife' | 'create' | 'profile';
  setActiveTab: (tab: 'feed' | 'market' | 'nightlife' | 'create' | 'profile') => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  createMode: 'post' | 'listing';
  setCreateMode: (mode: 'post' | 'listing') => void;

  // Post detail (comments view)
  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;

  // Theme
  theme: 'light' | 'dark';
  themePreference: 'system' | 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setThemePreference: (preference: 'system' | 'light' | 'dark') => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

  // Settings
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  pushNotificationsEnabled: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => void;
  emailNotificationsEnabled: boolean;
  setEmailNotificationsEnabled: (enabled: boolean) => void;
  showActivityStatus: boolean;
  setShowActivityStatus: (show: boolean) => void;
  anonymousByDefault: boolean;
  setAnonymousByDefault: (anon: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  isAuthenticated: false,
  email: '',
  setEmail: (email) => set({ email }),
  login: () => set({ isAuthenticated: true }),
  logout: () => set({
    isAuthenticated: false,
    email: '',
    showSettings: false,
    activeTab: 'feed',
    selectedPostId: null,
    selectedListing: null,
    selectedSellerId: null,
    showNotifications: false,
    showSearch: false,
  }),

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
  addPost: (content, category, media = []) =>
    set((state) => ({
      posts: [
        {
          id: `p${Date.now()}`,
          content,
          category,
          media,
          reactions: { fire: 0, cap: 0, dead: 0, real: 0, sus: 0 },
          commentCount: 0,
          timestamp: new Date(),
          isVerified: true,
        },
        ...state.posts,
      ],
    })),
  deletePost: (postId) =>
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
      comments: (() => {
        const c = { ...state.comments };
        delete c[postId];
        return c;
      })(),
    })),
  voteOnPoll: (postId, optionId) =>
    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId || !post.poll || post.poll.userVote !== undefined) return post;
        return {
          ...post,
          poll: {
            ...post.poll,
            userVote: optionId,
            totalVotes: post.poll.totalVotes + 1,
            options: post.poll.options.map((opt) =>
              opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
            ),
          },
        };
      }),
    })),

  // Comments
  comments: allMockComments,
  addComment: (postId, content, parentCommentId) =>
    set((state) => {
      const newComment: Comment = {
        id: `c${Date.now()}`,
        postId,
        content,
        timestamp: new Date(),
        upvotes: 0,
        replies: [],
        isOP: true,
      };

      const postComments = [...(state.comments[postId] || [])];

      if (parentCommentId) {
        // Add as reply to existing comment
        const addReply = (comments: Comment[]): Comment[] =>
          comments.map((c) => {
            if (c.id === parentCommentId) {
              return { ...c, replies: [...c.replies, newComment] };
            }
            return { ...c, replies: addReply(c.replies) };
          });
        return {
          comments: { ...state.comments, [postId]: addReply(postComments) },
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
          ),
        };
      }

      return {
        comments: { ...state.comments, [postId]: [newComment, ...postComments] },
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p
        ),
      };
    }),
  upvoteComment: (postId, commentId) =>
    set((state) => {
      const upvoteInList = (comments: Comment[]): Comment[] =>
        comments.map((c) => {
          if (c.id === commentId) return { ...c, upvotes: c.upvotes + 1 };
          return { ...c, replies: upvoteInList(c.replies) };
        });
      return {
        comments: {
          ...state.comments,
          [postId]: upvoteInList(state.comments[postId] || []),
        },
      };
    }),

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
          images: listing.images,
          seller: { id: 'self', name: 'You', rating: 5, totalSales: 0, joinDate: new Date() },
          reviews: [],
          views: 0,
          saved: 0,
        },
        ...state.listings,
      ],
    })),
  savedListings: [],
  toggleSaveListing: (listingId) =>
    set((state) => ({
      savedListings: state.savedListings.includes(listingId)
        ? state.savedListings.filter((id) => id !== listingId)
        : [...state.savedListings, listingId],
    })),

  nightlifeTickets: [
    {
      id: 'nt1',
      title: '2x TP Friday Guestlist',
      venue: 'Timepiece',
      price: 10,
      eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      sellerName: 'NightSeller_12',
      quantity: 2,
      status: 'active',
      isSold: false,
    },
    {
      id: 'nt2',
      title: 'Arena Saturday Ticket',
      venue: 'Arena Exeter',
      price: 7,
      eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1),
      sellerName: 'ClubPass_Exe',
      quantity: 1,
      status: 'active',
      isSold: false,
    },
  ],
  addNightlifeTicket: (ticket) =>
    set((state) => ({
      nightlifeTickets: [
        {
          ...ticket,
          id: `nt${Date.now()}`,
          sellerName: 'You',
          quantity: ticket.quantity ?? 1,
          status: 'active',
          isSold: false,
        },
        ...state.nightlifeTickets,
      ],
    })),
  nightlifePins: [
    {
      id: 'np1',
      name: 'Timepiece',
      type: 'nightclub',
      address: 'Little Castle Street, Exeter EX4 3PX',
      mapsQuery: 'Timepiece Exeter',
      lat: 50.7225,
      lng: -3.5326,
      isOpen: true,
    },
    {
      id: 'np2',
      name: 'Arena Exeter',
      type: 'nightclub',
      address: '17-18 King William Street, Exeter EX4 6PD',
      mapsQuery: 'Arena Exeter nightclub',
      lat: 50.7217,
      lng: -3.5319,
      isOpen: true,
    },
    {
      id: 'np3',
      name: 'Move Exeter',
      type: 'nightclub',
      address: '4 The Quay, Exeter EX2 4AP',
      mapsQuery: 'Move Exeter',
      lat: 50.7188,
      lng: -3.5315,
      isOpen: false,
    },
    {
      id: 'np4',
      name: 'Pennsylvania House Party',
      type: 'house-party',
      address: 'Pennsylvania Road, Exeter',
      mapsQuery: 'Pennsylvania Road Exeter',
      lat: 50.7358,
      lng: -3.5268,
    },
  ],
  addNightlifePin: (pin) =>
    set((state) => ({
      nightlifePins: [{ ...pin, id: `np${Date.now()}` }, ...state.nightlifePins],
    })),

  selectedListing: null,
  setSelectedListing: (listing) => set({ selectedListing: listing }),
  selectedSellerId: null,
  setSelectedSellerId: (id) => set({ selectedSellerId: id }),

  // Conversations
  conversations: [],
  activeConversation: null,
  setActiveConversation: (id) => set({ activeConversation: id }),
  sendMessage: (conversationId, content) =>
    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        const newMsg: Message = {
          id: `m${Date.now()}`,
          senderId: 'self',
          senderName: 'You',
          content,
          timestamp: new Date(),
          isOwn: true,
        };
        return {
          ...conv,
          messages: [...conv.messages, newMsg],
          lastMessage: content,
          lastMessageTime: new Date(),
        };
      }),
    })),
  startConversation: (listing) => {
    const state = get();
    // Check if conversation already exists for this listing
    const existing = state.conversations.find((c) => c.listingId === listing.id);
    if (existing) {
      set({ activeConversation: existing.id });
      return existing.id;
    }
    const id = `conv${Date.now()}`;
    const greeting: Message = {
      id: `m${Date.now()}`,
      senderId: 'self',
      senderName: 'You',
      content: `Hi! Is "${listing.title}" still available?`,
      timestamp: new Date(),
      isOwn: true,
    };
    const reply: Message = {
      id: `m${Date.now() + 1}`,
      senderId: listing.seller.id,
      senderName: listing.seller.name,
      content: 'Yes it is! When would you like to come see it?',
      timestamp: new Date(Date.now() + 500),
      isOwn: false,
    };
    const conv: Conversation = {
      id,
      listingId: listing.id,
      listingTitle: listing.title,
      sellerId: listing.seller.id,
      sellerName: listing.seller.name,
      messages: [greeting, reply],
      lastMessage: reply.content,
      lastMessageTime: reply.timestamp,
      unread: 1,
    };
    set((state) => ({
      conversations: [...state.conversations, conv],
      activeConversation: id,
    }));
    return id;
  },

  // Notifications
  notifications: mockNotifications,
  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  unreadNotificationCount: () => get().notifications.filter((n) => !n.read).length,

  activeTab: 'feed',
  setActiveTab: (tab) => set({ activeTab: tab }),
  showCreateModal: false,
  setShowCreateModal: (show) => set({ showCreateModal: show }),
  createMode: 'post',
  setCreateMode: (mode) => set({ createMode: mode }),

  // Post detail
  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  showSearch: false,
  setShowSearch: (show) => set({ showSearch: show, searchQuery: show ? get().searchQuery : '' }),

  theme: 'light',
  themePreference: 'system',
  setTheme: (theme) => set({ theme, themePreference: theme }),
  setThemePreference: (themePreference) =>
    set((state) => ({
      themePreference,
      theme: themePreference === 'system' ? state.theme : themePreference,
    })),
  setResolvedTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),

  // Settings
  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }),
  pushNotificationsEnabled: true,
  setPushNotificationsEnabled: (enabled) => set({ pushNotificationsEnabled: enabled }),
  emailNotificationsEnabled: true,
  setEmailNotificationsEnabled: (enabled) => set({ emailNotificationsEnabled: enabled }),
  showActivityStatus: true,
  setShowActivityStatus: (show) => set({ showActivityStatus: show }),
  anonymousByDefault: true,
  setAnonymousByDefault: (anon) => set({ anonymousByDefault: anon }),
}));
