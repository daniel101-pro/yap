import type { Conversation, Message } from '@/types';
import type { Conversation as DbConversation, Message as DbMessage } from '@prisma/client';

type PublicUser = { id: string; anonymousHandle: string | null };

type ConversationRow = DbConversation & {
  listing: { title: string };
  buyer: PublicUser;
  seller: PublicUser;
  messages?: (DbMessage & { sender: PublicUser })[];
};

export function serializeMessage(
  message: DbMessage & { sender: PublicUser },
  currentUserId: string,
): Message {
  return {
    id: message.id,
    senderName: message.sender.anonymousHandle ?? 'Anonymous',
    content: message.content,
    timestamp: message.createdAt,
    isOwn: message.senderId === currentUserId,
  };
}

export function serializeConversation(
  conv: ConversationRow,
  currentUserId: string,
): Conversation {
  const isBuyer = conv.buyerId === currentUserId;
  const otherParty = isBuyer ? conv.seller : conv.buyer;

  return {
    id: conv.id,
    listingId: conv.listingId,
    listingTitle: conv.listing.title,
    sellerName: otherParty.anonymousHandle ?? 'Anonymous',
    messages: (conv.messages ?? []).map((m) => serializeMessage(m, currentUserId)),
    lastMessage: conv.lastMessage,
    lastMessageTime: conv.lastMessageAt,
    unread: 0,
  };
}
