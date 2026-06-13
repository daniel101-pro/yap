import type { Conversation, Message } from '@/types';
import type { Conversation as DbConversation, Message as DbMessage, User } from '@prisma/client';

type ConversationRow = DbConversation & {
  listing: { title: string };
  buyer: User;
  seller: User;
  messages?: (DbMessage & { sender: User })[];
};

export function serializeMessage(
  message: DbMessage & { sender: User },
  currentUserId: string,
): Message {
  return {
    id: message.id,
    senderId: message.senderId,
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
    sellerId: conv.sellerId,
    sellerName: otherParty.anonymousHandle ?? 'Anonymous',
    messages: (conv.messages ?? []).map((m) => serializeMessage(m, currentUserId)),
    lastMessage: conv.lastMessage,
    lastMessageTime: conv.lastMessageAt,
    unread: 0,
  };
}
