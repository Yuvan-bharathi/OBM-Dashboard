import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Conversation, UserPresence } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Send, 
  Phone, 
  User, 
  Clock, 
  Check, 
  CheckCheck,
  Smile,
  Paperclip,
  MoreHorizontal 
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface EnhancedChatPanelProps {
  conversation: Conversation;
  messages: ChatMessage[];
  presence: Record<string, UserPresence>;
  onSendMessage: (content: string) => Promise<void>;
  onMarkAsRead: (messageId: string) => Promise<void>;
  onSetTyping: (isTyping: boolean) => Promise<void>;
  onLoadMoreMessages?: () => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export const EnhancedChatPanel: React.FC<EnhancedChatPanelProps> = ({
  conversation,
  messages,
  presence,
  onSendMessage,
  onMarkAsRead,
  onSetTyping,
  onLoadMoreMessages,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle typing indicators
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      onSetTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        onSetTyping(false);
      }, 3000);
    } else {
      onSetTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, onSetTyping]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;

    try {
      setIsSending(true);
      await onSendMessage(newMessage.trim());
      setNewMessage('');
      setIsTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (value: string) => {
    setNewMessage(value);
    
    // Set typing status
    if (value.trim() && !isTyping) {
      setIsTyping(true);
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
    }
  };

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(timestamp, 'HH:mm');
    } else {
      return format(timestamp, 'MMM dd, HH:mm');
    }
  };

  const getMessageStatusIcon = (message: ChatMessage) => {
    switch (message.status) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  const getPresenceStatus = (userId: string) => {
    const userPresence = presence[userId];
    if (!userPresence) return 'offline';
    return userPresence.status;
  };

  const getPresenceColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
  };

  const isCustomerTyping = () => {
    const customerPresence = presence[conversation.customerId];
    return customerPresence?.isTyping && 
           customerPresence?.typingInConversation === conversation.id;
  };

  if (!isOpen) return null;

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {conversation.customerName 
                    ? conversation.customerName.charAt(0).toUpperCase()
                    : <User className="h-4 w-4" />
                  }
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                getPresenceColor(getPresenceStatus(conversation.customerId))
              }`} />
            </div>
            
            <div>
              <CardTitle className="text-lg">
                {conversation.customerName || 'Unknown Customer'}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3 w-3" />
                {conversation.customerPhone}
                <Separator orientation="vertical" className="h-3" />
                <Clock className="h-3 w-3" />
                Last seen {formatDistanceToNow(conversation.lastMessageAt, { addSuffix: true })}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={conversation.status === 'active' ? 'default' : 'secondary'}
            >
              {conversation.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Messages */}
      <CardContent className="flex-1 p-0 flex flex-col min-h-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Start the conversation by sending a message
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.senderType === 'operator' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderType === 'operator'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center justify-between mt-1 text-xs ${
                      message.senderType === 'operator' 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      <span>{formatMessageTime(message.timestamp)}</span>
                      {message.senderType === 'operator' && (
                        <div className="ml-2">
                          {getMessageStatusIcon(message)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {isCustomerTyping() && (
              <div className="flex justify-start">
                <div className="bg-muted text-muted-foreground px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-1">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs ml-2">typing...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <Separator />

        {/* Message Input */}
        <div className="p-4">
          <div className="flex items-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="mb-1"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <div className="flex-1">
              <Input
                id="chat-message-input"
                name="message"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSending}
                className="resize-none"
                aria-label="Type a message to send"
              />
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="mb-1"
            >
              <Smile className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              size="sm"
              className="mb-1"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};