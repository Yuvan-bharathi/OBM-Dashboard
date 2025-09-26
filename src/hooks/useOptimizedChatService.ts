import { useState, useEffect, useCallback, useRef } from 'react';
import { OptimizedChatService } from '@/services/optimizedChatService';
import { Conversation, ChatMessage, UserPresence } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

interface UseOptimizedChatServiceReturn {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  presence: Record<string, UserPresence>;
  loading: boolean;
  error: string | null;
  usageStats: { reads: number; writes: number; lastReset: number };
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => Promise<void>;
  assignConversation: (conversationId: string, operatorId: string) => Promise<void>;
  loadMoreMessages: (conversationId: string) => Promise<void>;
  refreshConversations: () => void;
}

export const useOptimizedChatService = (activeConversationId?: string): UseOptimizedChatServiceReturn => {
  const { currentUser, userProfile, isOperator } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [presence, setPresence] = useState<Record<string, UserPresence>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState(OptimizedChatService.getUsageStats());
  
  // Refs to track active subscriptions
  const conversationsUnsubscribe = useRef<(() => void) | null>(null);
  const messagesUnsubscribe = useRef<(() => void) | null>(null);
  const presenceUnsubscribe = useRef<(() => void) | null>(null);
  const lastMessageDocs = useRef<Record<string, any>>({});

  // Update usage stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setUsageStats(OptimizedChatService.getUsageStats());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Subscribe to conversations with smart limits and caching
  useEffect(() => {
    if (!currentUser || !userProfile) return;
    
    // Check rate limit before subscribing
    if (!OptimizedChatService.checkRateLimit()) {
      setError('Rate limit exceeded. Some features temporarily disabled.');
      return;
    }

    setLoading(true);
    setError(null);

    // Clean up previous subscription
    if (conversationsUnsubscribe.current) {
      conversationsUnsubscribe.current();
    }

    const operatorId = isOperator ? currentUser.uid : undefined;
    
    conversationsUnsubscribe.current = OptimizedChatService.subscribeToConversations(
      (newConversations) => {
        setConversations(newConversations);
        setLoading(false);
        
        // Update usage stats
        setUsageStats(OptimizedChatService.getUsageStats());
      },
      operatorId,
      50 // Limit to 50 most recent conversations
    );

    return () => {
      if (conversationsUnsubscribe.current) {
        conversationsUnsubscribe.current();
        conversationsUnsubscribe.current = null;
      }
    };
  }, [currentUser, userProfile, isOperator]);

  // Subscribe to messages for active conversation only
  useEffect(() => {
    if (!activeConversationId) {
      // Clean up previous message subscription when no active conversation
      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;
      }
      return;
    }

    // Check rate limit
    if (!OptimizedChatService.checkRateLimit()) {
      return;
    }

    // Clean up previous subscription
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
    }

    messagesUnsubscribe.current = OptimizedChatService.subscribeToMessages(
      activeConversationId,
      (newMessages) => {
        setMessages(prev => ({
          ...prev,
          [activeConversationId]: newMessages
        }));
        
        // Update usage stats
        setUsageStats(OptimizedChatService.getUsageStats());
      },
      100 // Limit to 100 most recent messages
    );

    return () => {
      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;
      }
    };
  }, [activeConversationId]);

  // Smart presence subscription - only for visible users
  useEffect(() => {
    if (!currentUser || conversations.length === 0) {
      // Clean up presence subscription
      if (presenceUnsubscribe.current) {
        presenceUnsubscribe.current();
        presenceUnsubscribe.current = null;
      }
      return;
    }

    // Check rate limit
    if (!OptimizedChatService.checkRateLimit()) {
      return;
    }

    // Get users for presence tracking (limited set)
    const visibleUserIds = new Set<string>();
    
    // Add current user
    visibleUserIds.add(currentUser.uid);
    
    // Add assigned operators from visible conversations (limit to first 10)
    conversations.slice(0, 10).forEach(c => {
      if (c.assignedOperatorId) {
        visibleUserIds.add(c.assignedOperatorId);
      }
      // Add customer ID for active conversation only
      if (c.id === activeConversationId) {
        visibleUserIds.add(c.customerId);
      }
    });

    const userIds = Array.from(visibleUserIds);

    if (userIds.length === 0) return;

    // Clean up previous subscription
    if (presenceUnsubscribe.current) {
      presenceUnsubscribe.current();
    }

    presenceUnsubscribe.current = OptimizedChatService.subscribeToPresence(
      userIds,
      (newPresence) => {
        setPresence(newPresence);
        
        // Update usage stats
        setUsageStats(OptimizedChatService.getUsageStats());
      }
    );

    return () => {
      if (presenceUnsubscribe.current) {
        presenceUnsubscribe.current();
        presenceUnsubscribe.current = null;
      }
    };
  }, [currentUser, conversations, activeConversationId]);

  // Update user presence on mount/unmount
  useEffect(() => {
    if (!currentUser) return;

    OptimizedChatService.updateUserPresence(currentUser.uid, 'online');

    return () => {
      OptimizedChatService.updateUserPresence(currentUser.uid, 'offline');
    };
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      OptimizedChatService.cleanup();
    };
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!currentUser || !content.trim()) return;

    try {
      await OptimizedChatService.sendMessage(
        conversationId,
        currentUser.uid,
        'operator',
        content.trim()
      );
      
      // Update usage stats
      setUsageStats(OptimizedChatService.getUsageStats());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [currentUser]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!currentUser) return;

    try {
      // This would be implemented similar to the original but with write tracking
      console.log('Mark as read:', messageId);
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, [currentUser]);

  const setTyping = useCallback(async (conversationId: string, isTyping: boolean) => {
    if (!currentUser) return;

    try {
      await OptimizedChatService.setTypingStatus(currentUser.uid, conversationId, isTyping);
    } catch (err) {
      console.error('Failed to update typing status:', err);
    }
  }, [currentUser]);

  const assignConversation = useCallback(async (conversationId: string, operatorId: string) => {
    try {
      // This would be implemented similar to the original but with write tracking
      console.log('Assign conversation:', conversationId, operatorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign conversation');
      throw err;
    }
  }, []);

  const loadMoreMessages = useCallback(async (conversationId: string) => {
    try {
      const lastDoc = lastMessageDocs.current[conversationId];
      const result = await OptimizedChatService.loadMoreMessages(conversationId, lastDoc);
      
      if (result.messages.length > 0) {
        setMessages(prev => ({
          ...prev,
          [conversationId]: [
            ...(prev[conversationId] || []),
            ...result.messages
          ]
        }));
        
        if (result.lastDoc) {
          lastMessageDocs.current[conversationId] = result.lastDoc;
        }
      }
      
      // Update usage stats
      setUsageStats(OptimizedChatService.getUsageStats());
    } catch (err) {
      console.error('Failed to load more messages:', err);
    }
  }, []);

  const refreshConversations = useCallback(() => {
    // Force refresh by clearing cache and resubscribing
    // In a real implementation, we might clear specific cache entries
    console.log('Refresh conversations requested');
  }, []);

  return {
    conversations,
    messages,
    presence,
    loading,
    error,
    usageStats,
    sendMessage,
    markAsRead,
    setTyping,
    assignConversation,
    loadMoreMessages,
    refreshConversations,
  };
};