import {
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
  writeBatch,
  arrayUnion,
  increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  ChatMessage, 
  Conversation, 
  UserPresence, 
  MessageStatus,
  MessageReaction 
} from '@/types/chat';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'chat_messages';
const PRESENCE_COLLECTION = 'user_presence';
const MESSAGE_STATUS_COLLECTION = 'message_status';

export class ChatService {
  // Conversation Management
  static async createConversation(
    customerId: string, 
    customerName: string, 
    customerPhone: string
  ): Promise<Conversation> {
    const conversationRef = doc(collection(db, CONVERSATIONS_COLLECTION));
    
    const conversation: Omit<Conversation, 'id'> = {
      customerId,
      customerName,
      customerPhone,
      status: 'pending',
      lastMessageAt: new Date(),
      unreadCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      priority: 'medium',
    };

    await setDoc(conversationRef, {
      ...conversation,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    });

    return { id: conversationRef.id, ...conversation };
  }

  static async getConversation(conversationId: string): Promise<Conversation | null> {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    const conversationSnap = await getDoc(conversationRef);
    
    if (!conversationSnap.exists()) {
      return null;
    }

    const data = conversationSnap.data();
    return {
      id: conversationSnap.id,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      assignedOperatorId: data.assignedOperatorId,
      status: data.status,
      lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
      unreadCount: data.unreadCount || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      tags: data.tags || [],
      priority: data.priority || 'medium',
    };
  }

  static async updateConversation(
    conversationId: string, 
    updates: Partial<Conversation>
  ): Promise<void> {
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    await updateDoc(conversationRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  static async assignConversation(conversationId: string, operatorId: string): Promise<void> {
    await this.updateConversation(conversationId, {
      assignedOperatorId: operatorId,
      status: 'active',
    });
  }

  // Message Management
  static async sendMessage(
    conversationId: string,
    senderId: string,
    senderType: 'operator' | 'customer',
    content: string,
    messageType: 'text' | 'image' | 'file' | 'voice' = 'text'
  ): Promise<ChatMessage> {
    const messageRef = doc(collection(db, MESSAGES_COLLECTION));
    
    const message: Omit<ChatMessage, 'id'> = {
      conversationId,
      senderId,
      senderType,
      content,
      messageType,
      timestamp: new Date(),
      status: 'sent',
      reactions: [],
      attachments: [],
    };

    const batch = writeBatch(db);
    
    // Add message
    batch.set(messageRef, {
      ...message,
      timestamp: serverTimestamp(),
    });

    // Update conversation with last message
    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    batch.update(conversationRef, {
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      unreadCount: senderType === 'customer' ? increment(1) : 0,
    });

    await batch.commit();

    return { id: messageRef.id, ...message };
  }

  static async getMessages(
    conversationId: string, 
    limitCount: number = 50
  ): Promise<ChatMessage[]> {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        senderType: data.senderType,
        content: data.content,
        messageType: data.messageType,
        timestamp: data.timestamp?.toDate() || new Date(),
        status: data.status,
        reactions: data.reactions || [],
        attachments: data.attachments || [],
      };
    });
  }

  static async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      status: 'read',
    });

    // Update message status tracking
    const statusRef = doc(db, MESSAGE_STATUS_COLLECTION, messageId);
    await updateDoc(statusRef, {
      readBy: arrayUnion(userId),
      readAt: serverTimestamp(),
    });
  }

  static async addReaction(
    messageId: string, 
    userId: string, 
    emoji: string
  ): Promise<void> {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    const reaction: MessageReaction = {
      userId,
      emoji,
      timestamp: new Date(),
    };

    await updateDoc(messageRef, {
      reactions: arrayUnion({
        ...reaction,
        timestamp: serverTimestamp(),
      }),
    });
  }

  // Presence Management
  static async updateUserPresence(
    userId: string, 
    status: 'online' | 'offline' | 'away'
  ): Promise<void> {
    const presenceRef = doc(db, PRESENCE_COLLECTION, userId);
    await setDoc(presenceRef, {
      userId,
      status,
      lastSeen: serverTimestamp(),
      isTyping: false,
    }, { merge: true });
  }

  static async setTypingStatus(
    userId: string, 
    conversationId: string, 
    isTyping: boolean
  ): Promise<void> {
    const presenceRef = doc(db, PRESENCE_COLLECTION, userId);
    await updateDoc(presenceRef, {
      isTyping,
      typingInConversation: isTyping ? conversationId : null,
    });
  }

  // Real-time Subscriptions
  static subscribeToConversations(
    callback: (conversations: Conversation[]) => void,
    operatorId?: string
  ): Unsubscribe {
    let q = query(
      collection(db, CONVERSATIONS_COLLECTION),
      orderBy('lastMessageAt', 'desc')
    );

    // If operatorId provided, filter for assigned conversations
    if (operatorId) {
      q = query(
        collection(db, CONVERSATIONS_COLLECTION),
        where('assignedOperatorId', '==', operatorId),
        orderBy('lastMessageAt', 'desc')
      );
    }

    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          assignedOperatorId: data.assignedOperatorId,
          status: data.status,
          lastMessageAt: data.lastMessageAt?.toDate() || new Date(),
          unreadCount: data.unreadCount || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          tags: data.tags || [],
          priority: data.priority || 'medium',
        };
      });
      
      callback(conversations);
    });
  }

  static subscribeToMessages(
    conversationId: string,
    callback: (messages: ChatMessage[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          conversationId: data.conversationId,
          senderId: data.senderId,
          senderType: data.senderType,
          content: data.content,
          messageType: data.messageType,
          timestamp: data.timestamp?.toDate() || new Date(),
          status: data.status,
          reactions: data.reactions || [],
          attachments: data.attachments || [],
        };
      });
      
      callback(messages);
    });
  }

  static subscribeToPresence(
    userIds: string[],
    callback: (presence: Record<string, UserPresence>) => void
  ): Unsubscribe {
    const q = query(
      collection(db, PRESENCE_COLLECTION),
      where('userId', 'in', userIds)
    );

    return onSnapshot(q, (snapshot) => {
      const presenceMap: Record<string, UserPresence> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        presenceMap[data.userId] = {
          userId: data.userId,
          status: data.status,
          lastSeen: data.lastSeen?.toDate() || new Date(),
          isTyping: data.isTyping || false,
          typingInConversation: data.typingInConversation,
        };
      });
      
      callback(presenceMap);
    });
  }
}