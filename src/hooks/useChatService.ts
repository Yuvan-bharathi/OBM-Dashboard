import { useState, useEffect, useCallback } from 'react';
import { ChatService } from '@/services/chatService';
import { Conversation, ChatMessage, UserPresence } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';

interface UseChatServiceReturn {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  presence: Record<string, UserPresence>;
  loading: boolean;
  error: string | null;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markAsRead: (messageId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => Promise<void>;
  assignConversation: (conversationId: string, operatorId: string) => Promise<void>;
  refreshConversations: () => void;
}

export const useChatService = (activeConversationId?: string): UseChatServiceReturn => {
  const { currentUser, userProfile, isOperator } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [presence, setPresence] = useState<Record<string, UserPresence>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to conversations based on user role
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    setLoading(true);
    setError(null);

    const operatorId = isOperator ? currentUser.uid : undefined;
    
    const unsubscribe = ChatService.subscribeToConversations(
      (newConversations) => {
        setConversations(newConversations);
        setLoading(false);
      },
      operatorId
    );

    return unsubscribe;
  }, [currentUser, userProfile, isOperator]);

  // Subscribe to messages for active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const unsubscribe = ChatService.subscribeToMessages(
      activeConversationId,
      (newMessages) => {
        setMessages(prev => ({
          ...prev,
          [activeConversationId]: newMessages
        }));
      }
    );

    return unsubscribe;
  }, [activeConversationId]);

  // Subscribe to user presence
  useEffect(() => {
    if (!currentUser || conversations.length === 0) return;

    // Get all unique user IDs from conversations
    const userIds = [
      ...new Set([
        currentUser.uid,
        ...conversations.map(c => c.assignedOperatorId).filter(Boolean),
        ...conversations.map(c => c.customerId),
      ])
    ] as string[];

    if (userIds.length === 0) return;

    const unsubscribe = ChatService.subscribeToPresence(
      userIds,
      setPresence
    );

    return unsubscribe;
  }, [currentUser, conversations]);

  // Update user presence when component mounts
  useEffect(() => {
    if (!currentUser) return;

    ChatService.updateUserPresence(currentUser.uid, 'online');

    // Set offline when component unmounts
    return () => {
      ChatService.updateUserPresence(currentUser.uid, 'offline');
    };
  }, [currentUser]);

  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!currentUser || !content.trim()) return;

    try {
      await ChatService.sendMessage(
        conversationId,
        currentUser.uid,
        'operator',
        content.trim()
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      throw err;
    }
  }, [currentUser]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!currentUser) return;

    try {
      await ChatService.markMessageAsRead(messageId, currentUser.uid);
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, [currentUser]);

  const setTyping = useCallback(async (conversationId: string, isTyping: boolean) => {
    if (!currentUser) return;

    try {
      await ChatService.setTypingStatus(currentUser.uid, conversationId, isTyping);
    } catch (err) {
      console.error('Failed to update typing status:', err);
    }
  }, [currentUser]);

  const assignConversation = useCallback(async (conversationId: string, operatorId: string) => {
    try {
      await ChatService.assignConversation(conversationId, operatorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign conversation');
      throw err;
    }
  }, []);

  const refreshConversations = useCallback(() => {
    // Conversations are automatically updated via real-time subscription
    // This function exists for compatibility but doesn't need to do anything
  }, []);

  return {
    conversations,
    messages,
    presence,
    loading,
    error,
    sendMessage,
    markAsRead,
    setTyping,
    assignConversation,
    refreshConversations,
  };
};