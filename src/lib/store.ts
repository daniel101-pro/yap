import { create } from 'zustand';
import {
  Post,
  Listing,
  Reaction,
  PostCategory,
  MarketCategory,
  Comment,
  Notification,
  Conversation,
  Message,
  NightlifeTicket,
  NightlifePin,
} from '@/types';
import { api } from '@/lib/api';

interface BootstrapData {
  posts: Post[];
  listings: Listing[];
  nightlifeTickets: NightlifeTicket[];
  nightlifePins: NightlifePin[];
  notifications: Notification[];
  savedListingIds: string[];
}

interface AppState {
  isHydrated: boolean;
  isHydrating: boolean;
  hydrateFromServer: () => Promise<void>;

  posts: Post[];
  feedFilter: PostCategory | 'all';
  setFeedFilter: (filter: PostCategory | 'all') => void;
  reactToPost: (postId: string, reaction: Reaction) => Promise<void>;
  addPost: (content: string, category: PostCategory, media?: Post['media']) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  voteOnPoll: (postId: string, optionId: number) => Promise<void>;

  comments: Record<string, Comment[]>;
  fetchComments: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string, parentCommentId?: string) => Promise<void>;
  upvoteComment: (postId: string, commentId: string) => void;

  listings: Listing[];
  marketFilter: MarketCategory | 'all';
  setMarketFilter: (filter: MarketCategory | 'all') => void;
  addListing: (
    listing: Omit<
      Listing,
      'id' | 'timestamp' | 'isVerified' | 'isSold' | 'sellerKarma' | 'seller' | 'reviews' | 'views' | 'saved'
    >,
  ) => Promise<void>;
  savedListings: string[];
  toggleSaveListing: (listingId: string) => Promise<void>;

  nightlifeTickets: NightlifeTicket[];
  addNightlifeTicket: (ticket: Omit<NightlifeTicket, 'id' | 'sellerName' | 'isSold'>) => Promise<void>;
  nightlifePins: NightlifePin[];
  addNightlifePin: (pin: Omit<NightlifePin, 'id'>) => Promise<void>;

  selectedListing: Listing | null;
  setSelectedListing: (listing: Listing | null) => void;
  selectedSellerId: string | null;
  setSelectedSellerId: (id: string | null) => void;

  conversations: Conversation[];
  activeConversation: string | null;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string) => void;
  startConversation: (listing: Listing) => string;

  notifications: Notification[];
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  unreadNotificationCount: () => number;

  activeTab: 'feed' | 'market' | 'nightlife' | 'create' | 'profile';
  setActiveTab: (tab: 'feed' | 'market' | 'nightlife' | 'create' | 'profile') => void;
  resetAppState: () => void;
  showCreateModal: boolean;
  setShowCreateModal: (show: boolean) => void;
  createMode: 'post' | 'listing';
  setCreateMode: (mode: 'post' | 'listing') => void;

  selectedPostId: string | null;
  setSelectedPostId: (id: string | null) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showSearch: boolean;
  setShowSearch: (show: boolean) => void;

  theme: 'light' | 'dark';
  themePreference: 'system' | 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  setThemePreference: (preference: 'system' | 'light' | 'dark') => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;

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
  isHydrated: false,
  isHydrating: false,
  hydrateFromServer: async () => {
    if (get().isHydrating) return;
    set({ isHydrating: true });
    try {
      const data = await api<BootstrapData>('/api/bootstrap');
      set({
        posts: data.posts.map((p) => ({ ...p, timestamp: new Date(p.timestamp) })),
        listings: data.listings.map((l) => ({ ...l, timestamp: new Date(l.timestamp) })),
        nightlifeTickets: data.nightlifeTickets.map((t) => ({
          ...t,
          eventDate: new Date(t.eventDate),
        })),
        nightlifePins: data.nightlifePins,
        notifications: data.notifications.map((n) => ({ ...n, timestamp: new Date(n.timestamp) })),
        savedListings: data.savedListingIds,
        isHydrated: true,
        isHydrating: false,
      });
    } catch {
      set({ isHydrating: false });
    }
  },

  posts: [],
  feedFilter: 'all',
  setFeedFilter: (filter) => set({ feedFilter: filter }),
  reactToPost: async (postId, reaction) => {
    const { post } = await api<{ post: Post }>(`/api/posts/${postId}/react`, {
      method: 'POST',
      body: JSON.stringify({ reaction }),
    });
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...post, timestamp: new Date(post.timestamp) } : p,
      ),
    }));
  },
  addPost: async (content, category, media = []) => {
    const { post } = await api<{ post: Post }>('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content, category, media }),
    });
    set((state) => ({
      posts: [{ ...post, timestamp: new Date(post.timestamp) }, ...state.posts],
    }));
  },
  deletePost: async (postId) => {
    await api(`/api/posts/${postId}`, { method: 'DELETE' });
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
      comments: (() => {
        const c = { ...state.comments };
        delete c[postId];
        return c;
      })(),
    }));
  },
  voteOnPoll: async (postId, optionId) => {
    const { post } = await api<{ post: Post }>(`/api/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    });
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...post, timestamp: new Date(post.timestamp) } : p,
      ),
    }));
  },

  comments: {},
  fetchComments: async (postId) => {
    const { comments } = await api<{ comments: Comment[] }>(`/api/posts/${postId}/comments`);
    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: comments.map((c) => ({
          ...c,
          timestamp: new Date(c.timestamp),
          replies: c.replies.map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
        })),
      },
    }));
  },
  addComment: async (postId, content, parentCommentId) => {
    const { comment } = await api<{ comment: Comment }>(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, parentId: parentCommentId }),
    });
    const normalized = {
      ...comment,
      timestamp: new Date(comment.timestamp),
      replies: comment.replies.map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
    };

    set((state) => {
      const postComments = state.comments[postId] ?? [];
      if (parentCommentId) {
        const addReply = (comments: Comment[]): Comment[] =>
          comments.map((c) => {
            if (c.id === parentCommentId) {
              return { ...c, replies: [...c.replies, normalized] };
            }
            return { ...c, replies: addReply(c.replies) };
          });
        return {
          comments: { ...state.comments, [postId]: addReply(postComments) },
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
          ),
        };
      }
      return {
        comments: { ...state.comments, [postId]: [normalized, ...postComments] },
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
        ),
      };
    });
  },
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

  listings: [],
  marketFilter: 'all',
  setMarketFilter: (filter) => set({ marketFilter: filter }),
  addListing: async (listing) => {
    const { listing: created } = await api<{ listing: Listing }>('/api/listings', {
      method: 'POST',
      body: JSON.stringify(listing),
    });
    set((state) => ({
      listings: [{ ...created, timestamp: new Date(created.timestamp) }, ...state.listings],
    }));
  },
  savedListings: [],
  toggleSaveListing: async (listingId) => {
    const { listing, saved } = await api<{ listing: Listing; saved: boolean }>(
      `/api/listings/${listingId}/save`,
      { method: 'POST' },
    );
    set((state) => ({
      savedListings: saved
        ? [...state.savedListings, listingId]
        : state.savedListings.filter((id) => id !== listingId),
      listings: state.listings.map((l) =>
        l.id === listingId ? { ...listing, timestamp: new Date(listing.timestamp) } : l,
      ),
    }));
  },

  nightlifeTickets: [],
  addNightlifeTicket: async (ticket) => {
    const { ticket: created } = await api<{ ticket: NightlifeTicket }>('/api/nightlife/tickets', {
      method: 'POST',
      body: JSON.stringify(ticket),
    });
    set((state) => ({
      nightlifeTickets: [
        { ...created, eventDate: new Date(created.eventDate) },
        ...state.nightlifeTickets,
      ],
    }));
  },
  nightlifePins: [],
  addNightlifePin: async (pin) => {
    const { pin: created } = await api<{ pin: NightlifePin }>('/api/nightlife/pins', {
      method: 'POST',
      body: JSON.stringify(pin),
    });
    set((state) => ({
      nightlifePins: [created, ...state.nightlifePins],
    }));
  },

  selectedListing: null,
  setSelectedListing: (listing) => set({ selectedListing: listing }),
  selectedSellerId: null,
  setSelectedSellerId: (id) => set({ selectedSellerId: id }),

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

  notifications: [],
  showNotifications: false,
  setShowNotifications: (show) => set({ showNotifications: show }),
  markNotificationRead: async (id) => {
    await api(`/api/notifications/${id}/read`, { method: 'PATCH' });
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  },
  markAllNotificationsRead: async () => {
    await api('/api/notifications/read-all', { method: 'POST' });
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
  },
  unreadNotificationCount: () => get().notifications.filter((n) => !n.read).length,

  activeTab: 'feed',
  setActiveTab: (tab) => set({ activeTab: tab }),
  resetAppState: () =>
    set({
      showSettings: false,
      activeTab: 'feed',
      selectedPostId: null,
      selectedListing: null,
      selectedSellerId: null,
      showNotifications: false,
      showSearch: false,
      searchQuery: '',
      isHydrated: false,
    }),
  showCreateModal: false,
  setShowCreateModal: (show) => set({ showCreateModal: show }),
  createMode: 'post',
  setCreateMode: (mode) => set({ createMode: mode }),

  selectedPostId: null,
  setSelectedPostId: (id) => set({ selectedPostId: id }),

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
