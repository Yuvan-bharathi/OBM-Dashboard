import React from 'react';
import { Conversation, UserPresence } from '@/types/chat';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Clock, User } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  presence: Record<string, UserPresence>;
  activeConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  className?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  presence,
  activeConversationId,
  onConversationSelect,
  className,
}) => {
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

  const formatLastMessage = (conversation: Conversation) => {
    if (!conversation.lastMessage) return 'No messages yet';
    
    const content = conversation.lastMessage.content;
    const maxLength = 50;
    return content.length > maxLength 
      ? `${content.substring(0, maxLength)}...` 
      : content;
  };

  if (conversations.length === 0) {
    return (
      <div className={`${className} flex flex-col items-center justify-center p-8 text-center`}>
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Conversations</h3>
        <p className="text-sm text-muted-foreground">
          When customers start chatting, their conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Conversations</h2>
        <p className="text-sm text-muted-foreground">
          {conversations.length} active conversation{conversations.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.map((conversation) => (
            <Card 
              key={conversation.id}
              className={`cursor-pointer transition-all hover:bg-accent/50 ${
                activeConversationId === conversation.id 
                  ? 'ring-2 ring-primary bg-accent/30' 
                  : ''
              }`}
              onClick={() => onConversationSelect(conversation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {conversation.customerName 
                          ? conversation.customerName.charAt(0).toUpperCase()
                          : <User className="h-4 w-4" />
                        }
                      </AvatarFallback>
                    </Avatar>
                    {conversation.assignedOperatorId && (
                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background ${
                        getPresenceColor(getPresenceStatus(conversation.assignedOperatorId))
                      }`} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-foreground truncate">
                        {conversation.customerName || 'Unknown Customer'}
                      </h3>
                      <div className="flex items-center gap-2">
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <Badge 
                          variant={conversation.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {conversation.status}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {conversation.customerPhone}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate flex-1 mr-2">
                        {formatLastMessage(conversation)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(conversation.lastMessageAt, { addSuffix: true })}
                      </div>
                    </div>
                    
                    {conversation.tags && conversation.tags.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {conversation.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {conversation.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{conversation.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};