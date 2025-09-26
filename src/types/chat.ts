export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'operator' | 'customer';
  content: string;
  messageType: 'text' | 'image' | 'file' | 'voice';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
}

export interface MessageReaction {
  userId: string;
  emoji: string;
  timestamp: Date;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Conversation {
  id: string;
  customerId: string;
  customerName?: string;
  customerPhone: string;
  assignedOperatorId?: string;
  status: 'active' | 'closed' | 'pending';
  lastMessage?: ChatMessage;
  lastMessageAt: Date;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  priority: 'low' | 'medium' | 'high';
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen: Date;
  isTyping?: boolean;
  typingInConversation?: string;
}

export interface MessageStatus {
  messageId: string;
  conversationId: string;
  deliveredTo: string[];
  readBy: string[];
  deliveredAt?: Date;
  readAt?: Date;
}