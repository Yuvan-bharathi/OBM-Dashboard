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
  increment,
  startAfter,
  DocumentSnapshot
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

// Cache and optimization settings
const CACHE_DURATION = 30000; // 30 seconds
const DEBOUNCE_DELAY = 1000; // 1 second
const DEFAULT_CONVERSATION_LIMIT = 25;
const DEFAULT_MESSAGE_LIMIT = 50;
const MAX_PRESENCE_USERS = 20;

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface FirebaseUsageStats {
  reads: number;
  writes: number;
  lastReset: number;
}

export class OptimizedChatService {
  private static cache = new Map<string, CachedData<any>>();
  private static debounceTimers = new Map<string, NodeJS.Timeout>();
  private static activeListeners = new Map<string, Unsubscribe>();
  private static usageStats: FirebaseUsageStats = { reads: 0, writes: 0, lastReset: Date.now() };

  // Usage monitoring
  static getUsageStats(): FirebaseUsageStats {
    const now = Date.now();
    const hoursSinceReset = (now - this.usageStats.lastReset) / (1000 * 60 * 60);
    
    if (hoursSinceReset >= 24) {
      this.usageStats = { reads: 0, writes: 0, lastReset: now };
    }
    
    return { ...this.usageStats };
  }

  private static incrementReads(count: number = 1) {
    this.usageStats.reads += count;
    console.log(`📊 Firebase reads: ${this.usageStats.reads} (+${count})`);
  }

  private static incrementWrites(count: number = 1) {
    this.usageStats.writes += count;
    console.log(`📊 Firebase writes: ${this.usageStats.writes} (+${count})`);
  }

  // Cache management
  private static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`💾 Cache hit for: ${key}`);
    return cached.data;
  }

  private static setCachedData<T>(key: string, data: T, duration: number = CACHE_DURATION): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration
    });
    console.log(`💾 Cache set for: ${key}`);
  }

  // Debounced listener management
  private static setupDebouncedListener(
    key: string,
    listenerFn: () => Unsubscribe,
    delay: number = DEBOUNCE_DELAY
  ): void {
    // Clear existing timer
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Clear existing listener
    const existingListener = this.activeListeners.get(key);
    if (existingListener) {
      existingListener();
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      const unsubscribe = listenerFn();
      this.activeListeners.set(key, unsubscribe);
      this.debounceTimers.delete(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  // Optimized conversation subscriptions with smart limits
  static subscribeToConversations(
    callback: (conversations: Conversation[]) => void,
    operatorId?: string,
    limitCount: number = DEFAULT_CONVERSATION_LIMIT
  ): Unsubscribe {
    const cacheKey = `conversations_${operatorId || 'all'}_${limitCount}`;
    
    // Check cache first
    const cached = this.getCachedData<Conversation[]>(cacheKey);
    if (cached) {
      callback(cached);
    }

    const listenerKey = `conv_listener_${operatorId || 'all'}`;

    this.setupDebouncedListener(listenerKey, () => {
      // Time-based constraint (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let q = query(
        collection(db, CONVERSATIONS_COLLECTION),
        where('updatedAt', '>=', thirtyDaysAgo),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      // If operatorId provided, filter for assigned conversations
      if (operatorId) {
        q = query(
          collection(db, CONVERSATIONS_COLLECTION),
          where('assignedOperatorId', '==', operatorId),
          where('updatedAt', '>=', thirtyDaysAgo),
          orderBy('updatedAt', 'desc'),
          limit(limitCount)
        );
      }

      return onSnapshot(q, (snapshot) => {
        this.incrementReads(snapshot.size);
        
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
        
        // Cache the results
        this.setCachedData(cacheKey, conversations);
        callback(conversations);
      });
    });

    // Return cleanup function
    return () => {
      const timer = this.debounceTimers.get(listenerKey);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(listenerKey);
      }
      
      const listener = this.activeListeners.get(listenerKey);
      if (listener) {
        listener();
        this.activeListeners.delete(listenerKey);
      }
    };
  }

  // Optimized message subscription - only for active conversations
  static subscribeToMessages(
    conversationId: string,
    callback: (messages: ChatMessage[]) => void,
    limitCount: number = DEFAULT_MESSAGE_LIMIT
  ): Unsubscribe {
    const cacheKey = `messages_${conversationId}_${limitCount}`;
    const listenerKey = `msg_listener_${conversationId}`;
    
    // Check cache first
    const cached = this.getCachedData<ChatMessage[]>(cacheKey);
    if (cached) {
      callback(cached);
    }

    this.setupDebouncedListener(listenerKey, () => {
      // Only get recent messages (last 12 hours for initial load)
      const twelveHoursAgo = new Date();
      twelveHoursAgo.setHours(twelveHoursAgo.getHours() - 12);

      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId),
        where('timestamp', '>=', twelveHoursAgo),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      return onSnapshot(q, (snapshot) => {
        this.incrementReads(snapshot.size);
        
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
        }).reverse();
        
        // Cache the results
        this.setCachedData(cacheKey, messages);
        callback(messages);
      });
    });

    return () => {
      const timer = this.debounceTimers.get(listenerKey);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(listenerKey);
      }
      
      const listener = this.activeListeners.get(listenerKey);
      if (listener) {
        listener();
        this.activeListeners.delete(listenerKey);
      }
    };
  }

  // Smart presence subscription - limit to visible users only
  static subscribeToPresence(
    userIds: string[],
    callback: (presence: Record<string, UserPresence>) => void
  ): Unsubscribe {
    // Limit presence tracking to prevent excessive reads
    const limitedUserIds = userIds.slice(0, MAX_PRESENCE_USERS);
    const cacheKey = `presence_${limitedUserIds.sort().join('_')}`;
    const listenerKey = `presence_listener_${cacheKey}`;
    
    if (limitedUserIds.length === 0) {
      callback({});
      return () => {};
    }

    // Check cache first
    const cached = this.getCachedData<Record<string, UserPresence>>(cacheKey);
    if (cached) {
      callback(cached);
    }

    this.setupDebouncedListener(listenerKey, () => {
      const q = query(
        collection(db, PRESENCE_COLLECTION),
        where('userId', 'in', limitedUserIds)
      );

      return onSnapshot(q, (snapshot) => {
        this.incrementReads(snapshot.size);
        
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
        
        // Cache the results
        this.setCachedData(cacheKey, presenceMap);
        callback(presenceMap);
      });
    });

    return () => {
      const timer = this.debounceTimers.get(listenerKey);
      if (timer) {
        clearTimeout(timer);
        this.debounceTimers.delete(listenerKey);
      }
      
      const listener = this.activeListeners.get(listenerKey);
      if (listener) {
        listener();
        this.activeListeners.delete(listenerKey);
      }
    };
  }

  // Load more messages with pagination
  static async loadMoreMessages(
    conversationId: string,
    lastDoc?: DocumentSnapshot,
    limitCount: number = 50
  ): Promise<{ messages: ChatMessage[]; lastDoc?: DocumentSnapshot }> {
    let q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', conversationId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        collection(db, MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
    this.incrementReads(snapshot.size);

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
    }).reverse();

    const newLastDoc = snapshot.docs[snapshot.docs.length - 1];

    return { messages, lastDoc: newLastDoc };
  }

  // 🚨 EMERGENCY: Enhanced circuit breaker for excessive reads
  static checkRateLimit(): boolean {
    const stats = this.getUsageStats();
    const maxReadsPerDay = 500; // 🚨 EMERGENCY: Drastically reduced from 5000 to 500
    
    if (stats.reads > maxReadsPerDay) {
      console.warn('🚨 EMERGENCY: Firebase read limit exceeded, ALL Firebase features disabled');
      return false;
    }
    
    if (stats.reads > maxReadsPerDay * 0.8) {
      console.warn('🚨 WARNING: Approaching Firebase read limit');
    }
    
    return true;
  }

  // All other methods remain the same as ChatService but with write tracking
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
    
    batch.set(messageRef, {
      ...message,
      timestamp: serverTimestamp(),
    });

    const conversationRef = doc(db, CONVERSATIONS_COLLECTION, conversationId);
    batch.update(conversationRef, {
      lastMessageAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      unreadCount: senderType === 'customer' ? increment(1) : 0,
    });

    await batch.commit();
    this.incrementWrites(2); // Message + conversation update

    // Clear relevant caches
    this.cache.delete(`messages_${conversationId}_${DEFAULT_MESSAGE_LIMIT}`);
    
    return { id: messageRef.id, ...message };
  }

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
    
    this.incrementWrites(1);
  }

  static async setTypingStatus(
    userId: string, 
    conversationId: string, 
    isTyping: boolean
  ): Promise<void> {
    // Debounce typing updates to reduce writes
    const key = `typing_${userId}_${conversationId}`;
    const existingTimer = this.debounceTimers.get(key);
    
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      const presenceRef = doc(db, PRESENCE_COLLECTION, userId);
      await updateDoc(presenceRef, {
        isTyping,
        typingInConversation: isTyping ? conversationId : null,
      });
      
      this.incrementWrites(1);
      this.debounceTimers.delete(key);
    }, 500); // 500ms debounce for typing

    this.debounceTimers.set(key, timer);
  }

  // Cleanup method to call when app unmounts
  static cleanup(): void {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    
    // Unsubscribe from all listeners
    this.activeListeners.forEach(unsubscribe => unsubscribe());
    this.activeListeners.clear();
    
    // Clear cache
    this.cache.clear();
    
    console.log('🧹 OptimizedChatService cleanup completed');
  }
}
