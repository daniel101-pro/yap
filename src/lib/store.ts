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
import { applyOptimisticReaction } from '@/lib/optimistic';

interface UserProfile {
  id: string;
  email: string;
  anonymousHandle: string;
  karma: number;
}

interface BootstrapData {
  user: UserProfile;
  posts: Post[];
  listings: Listing[];
  nightlifeTickets: NightlifeTicket[];
  nightlifePins: NightlifePin[];
  notifications: Notification[];
  savedListingIds: string[];
  conversations: Conversation[];
}

function persistSetting(key: string, value: boolean) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(key, value ? '1' : '0');
  }
}

function readSetting(key: string, fallback: boolean) {
  if (typeof window === 'undefined') return fallback;
  const v = window.localStorage.getItem(key);
  if (v === '1') return true;
  if (v === '0') return false;
  return fallback;
}

function normalizeConversation(c: Conversation): Conversation {
  return {
    ...c,
    lastMessageTime: new Date(c.lastMessageTime),
    messages: c.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
  };
}

interface AppState {
  isHydrated: boolean;
  isHydrating: boolean;
  hydrationError: string | null;
  hydrateFromServer: () => Promise<void>;
  syncFromServer: () => Promise<void>;

  userProfile: UserProfile | null;
  loadLocalPreferences: () => void;
  deleteAccount: () => Promise<void>;

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
  upvoteComment: (postId: string, commentId: string) => Promise<void>;

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
  deleteListing: (listingId: string) => Promise<void>;
  updateListingSold: (listingId: string, isSold: boolean) => Promise<void>;
  recordListingView: (listingId: string) => Promise<void>;

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
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  startConversation: (listing: Listing) => Promise<string>;

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
  hydrationError: null,
  userProfile: null,

  loadLocalPreferences: () => {
    set({
      pushNotificationsEnabled: readSetting('yap-push-notifications', true),
      emailNotificationsEnabled: readSetting('yap-email-notifications', true),
      showActivityStatus: readSetting('yap-show-activity', true),
      anonymousByDefault: readSetting('yap-anonymous-default', true),
    });
  },

  deleteAccount: async () => {
    await api('/api/user', { method: 'DELETE' });
  },

  hydrateFromServer: async () => {
    if (get().isHydrating) return;
    set({ isHydrating: true, hydrationError: null });
    try {
      const data = await api<BootstrapData>('/api/bootstrap');
      set({
        userProfile: data.user,
        posts: data.posts.map((p) => ({ ...p, timestamp: new Date(p.timestamp) })),
        listings: data.listings.map((l) => ({ ...l, timestamp: new Date(l.timestamp) })),
        nightlifeTickets: data.nightlifeTickets.map((t) => ({
          ...t,
          eventDate: new Date(t.eventDate),
        })),
        nightlifePins: data.nightlifePins,
        notifications: data.notifications.map((n) => ({ ...n, timestamp: new Date(n.timestamp) })),
        savedListings: data.savedListingIds,
        conversations: data.conversations.map(normalizeConversation),
        isHydrated: true,
        isHydrating: false,
        hydrationError: null,
      });
    } catch (err) {
      set({
        isHydrating: false,
        hydrationError: err instanceof Error ? err.message : 'Could not load your data',
      });
    }
  },

  syncFromServer: async () => {
    if (!get().isHydrated || get().isHydrating) return;
    try {
      const data = await api<BootstrapData>('/api/bootstrap');
      set((state) => {
        const listings = data.listings.map((l) => ({ ...l, timestamp: new Date(l.timestamp) }));
        const selectedId = state.selectedListing?.id;
        const freshSelected = selectedId
          ? listings.find((l) => l.id === selectedId)
          : null;

        return {
          userProfile: data.user,
          posts: data.posts.map((p) => ({ ...p, timestamp: new Date(p.timestamp) })),
          listings,
          nightlifeTickets: data.nightlifeTickets.map((t) => ({
            ...t,
            eventDate: new Date(t.eventDate),
          })),
          nightlifePins: data.nightlifePins,
          notifications: data.notifications.map((n) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          })),
          savedListings: data.savedListingIds,
          conversations: data.conversations.map(normalizeConversation),
          selectedListing: freshSelected
            ? { ...freshSelected, timestamp: new Date(freshSelected.timestamp) }
            : state.selectedListing,
        };
      });
    } catch {
      // background sync — fail silently
    }
  },

  posts: [],
  feedFilter: 'all',
  setFeedFilter: (filter) => set({ feedFilter: filter }),
  reactToPost: async (postId, reaction) => {
    const prevPosts = get().posts;
    const current = prevPosts.find((p) => p.id === postId);
    if (!current) return;

    const optimistic = applyOptimisticReaction(current, reaction);
    set({
      posts: prevPosts.map((p) => (p.id === postId ? optimistic : p)),
    });

    try {
      const { post } = await api<{ post: Post }>(`/api/posts/${postId}/react`, {
        method: 'POST',
        body: JSON.stringify({ reaction }),
      });
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...post, timestamp: new Date(post.timestamp) } : p,
        ),
      }));
    } catch {
      set({ posts: prevPosts });
    }
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
    const prevPosts = get().posts;
    const current = prevPosts.find((p) => p.id === postId);
    if (!current?.poll || current.poll.userVote !== undefined) return;

    const optimisticPoll = {
      ...current.poll,
      userVote: optionId,
      totalVotes: current.poll.totalVotes + 1,
      options: current.poll.options.map((o) =>
        o.id === optionId ? { ...o, votes: o.votes + 1 } : o,
      ),
    };
    set({
      posts: prevPosts.map((p) =>
        p.id === postId ? { ...p, poll: optimisticPoll } : p,
      ),
    });

    try {
      const { post } = await api<{ post: Post }>(`/api/posts/${postId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ optionId }),
      });
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId ? { ...post, timestamp: new Date(post.timestamp) } : p,
        ),
      }));
    } catch {
      set({ posts: prevPosts });
    }
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
    const tempId = `temp-${Date.now()}`;
    const optimistic: Comment = {
      id: tempId,
      postId,
      content,
      timestamp: new Date(),
      upvotes: 0,
      replies: [],
      isOP: false,
    };

    set((state) => {
      const postComments = state.comments[postId] ?? [];
      if (parentCommentId) {
        const addReply = (comments: Comment[]): Comment[] =>
          comments.map((c) => {
            if (c.id === parentCommentId) {
              return { ...c, replies: [...c.replies, optimistic] };
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
        comments: { ...state.comments, [postId]: [optimistic, ...postComments] },
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
        ),
      };
    });

    try {
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
        const replaceTemp = (comments: Comment[]): Comment[] =>
          comments.map((c) => {
            if (c.id === tempId) return normalized;
            return { ...c, replies: replaceTemp(c.replies) };
          });

        const postComments = state.comments[postId] ?? [];
        if (parentCommentId) {
          const updateReplies = (comments: Comment[]): Comment[] =>
            comments.map((c) => {
              if (c.id === parentCommentId) {
                return {
                  ...c,
                  replies: c.replies.map((r) => (r.id === tempId ? normalized : r)),
                };
              }
              return { ...c, replies: updateReplies(c.replies) };
            });
          return {
            comments: { ...state.comments, [postId]: updateReplies(postComments) },
          };
        }
        return {
          comments: {
            ...state.comments,
            [postId]: replaceTemp(postComments),
          },
        };
      });
    } catch {
      set((state) => {
        const removeTemp = (comments: Comment[]): Comment[] =>
          comments
            .filter((c) => c.id !== tempId)
            .map((c) => ({ ...c, replies: removeTemp(c.replies) }));

        return {
          comments: {
            ...state.comments,
            [postId]: removeTemp(state.comments[postId] ?? []),
          },
          posts: state.posts.map((p) =>
            p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p,
          ),
        };
      });
      throw new Error('Could not post comment');
    }
  },
  upvoteComment: async (postId, commentId) => {
    const { comment } = await api<{ comment: Comment }>(
      `/api/comments/${commentId}/upvote`,
      { method: 'POST' },
    );
    const normalized = {
      ...comment,
      timestamp: new Date(comment.timestamp),
      replies: comment.replies.map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
    };
    const updateInList = (comments: Comment[]): Comment[] =>
      comments.map((c) => {
        if (c.id === commentId) return normalized;
        return { ...c, replies: updateInList(c.replies) };
      });
    set((state) => ({
      comments: {
        ...state.comments,
        [postId]: updateInList(state.comments[postId] ?? []),
      },
    }));
  },

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
    const wasSaved = get().savedListings.includes(listingId);
    const prevListings = get().listings;

    set((state) => ({
      savedListings: wasSaved
        ? state.savedListings.filter((id) => id !== listingId)
        : [...state.savedListings, listingId],
      listings: state.listings.map((l) =>
        l.id === listingId ? { ...l, saved: Math.max(0, l.saved + (wasSaved ? -1 : 1)) } : l,
      ),
    }));

    try {
      const { listing, saved } = await api<{ listing: Listing; saved: boolean }>(
        `/api/listings/${listingId}/save`,
        { method: 'POST' },
      );
      set((state) => ({
        savedListings: saved
          ? [...new Set([...state.savedListings, listingId])]
          : state.savedListings.filter((id) => id !== listingId),
        listings: state.listings.map((l) =>
          l.id === listingId ? { ...listing, timestamp: new Date(listing.timestamp) } : l,
        ),
      }));
    } catch {
      set({ savedListings: get().savedListings, listings: prevListings });
    }
  },
  deleteListing: async (listingId) => {
    await api(`/api/listings/${listingId}`, { method: 'DELETE' });
    set((state) => ({
      listings: state.listings.filter((l) => l.id !== listingId),
      savedListings: state.savedListings.filter((id) => id !== listingId),
      selectedListing:
        state.selectedListing?.id === listingId ? null : state.selectedListing,
      conversations: state.conversations.filter((c) => c.listingId !== listingId),
    }));
  },
  updateListingSold: async (listingId, isSold) => {
    const { listing } = await api<{ listing: Listing }>(`/api/listings/${listingId}`, {
      method: 'PATCH',
      body: JSON.stringify({ isSold }),
    });
    set((state) => ({
      listings: state.listings.map((l) =>
        l.id === listingId ? { ...listing, timestamp: new Date(listing.timestamp) } : l,
      ),
      selectedListing:
        state.selectedListing?.id === listingId
          ? { ...listing, timestamp: new Date(listing.timestamp) }
          : state.selectedListing,
    }));
  },
  recordListingView: async (listingId) => {
    try {
      const { listing } = await api<{ listing: Listing }>(`/api/listings/${listingId}/view`, {
        method: 'POST',
      });
      set((state) => ({
        listings: state.listings.map((l) =>
          l.id === listingId ? { ...listing, timestamp: new Date(listing.timestamp) } : l,
        ),
        selectedListing:
          state.selectedListing?.id === listingId
            ? { ...listing, timestamp: new Date(listing.timestamp) }
            : state.selectedListing,
      }));
    } catch {
      // non-critical
    }
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
  sendMessage: async (conversationId, content) => {
    const tempId = `temp-msg-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      senderId: 'self',
      senderName: 'You',
      content,
      timestamp: new Date(),
      isOwn: true,
    };

    set((state) => ({
      conversations: state.conversations.map((conv) => {
        if (conv.id !== conversationId) return conv;
        return {
          ...conv,
          messages: [...conv.messages, optimistic],
          lastMessage: content,
          lastMessageTime: new Date(),
        };
      }),
    }));

    try {
      const { message } = await api<{ message: Message }>(
        `/api/conversations/${conversationId}/messages`,
        { method: 'POST', body: JSON.stringify({ content }) },
      );
      const normalized = { ...message, timestamp: new Date(message.timestamp) };
      set((state) => ({
        conversations: state.conversations.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            messages: conv.messages.map((m) => (m.id === tempId ? normalized : m)),
            lastMessage: content,
            lastMessageTime: new Date(),
          };
        }),
      }));
    } catch {
      set((state) => ({
        conversations: state.conversations.map((conv) => {
          if (conv.id !== conversationId) return conv;
          return {
            ...conv,
            messages: conv.messages.filter((m) => m.id !== tempId),
          };
        }),
      }));
      throw new Error('Could not send message');
    }
  },
  startConversation: async (listing) => {
    const initialMessage = `Hi! Is "${listing.title}" still available?`;
    const { conversation } = await api<{ conversation: Conversation }>('/api/conversations', {
      method: 'POST',
      body: JSON.stringify({ listingId: listing.id, initialMessage }),
    });
    const normalized = normalizeConversation(conversation);
    set((state) => ({
      conversations: [
        normalized,
        ...state.conversations.filter((c) => c.id !== normalized.id),
      ],
      activeConversation: normalized.id,
    }));
    return normalized.id;
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
      hydrationError: null,
      userProfile: null,
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
  setPushNotificationsEnabled: (enabled) => {
    persistSetting('yap-push-notifications', enabled);
    set({ pushNotificationsEnabled: enabled });
  },
  emailNotificationsEnabled: true,
  setEmailNotificationsEnabled: (enabled) => {
    persistSetting('yap-email-notifications', enabled);
    set({ emailNotificationsEnabled: enabled });
  },
  showActivityStatus: true,
  setShowActivityStatus: (show) => {
    persistSetting('yap-show-activity', show);
    set({ showActivityStatus: show });
  },
  anonymousByDefault: true,
  setAnonymousByDefault: (anon) => {
    persistSetting('yap-anonymous-default', anon);
    set({ anonymousByDefault: anon });
  },
}));
