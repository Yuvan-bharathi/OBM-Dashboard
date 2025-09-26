import React, { useState } from 'react';
import { useOptimizedChatService } from '@/hooks/useOptimizedChatService';
import { ConversationList } from '@/components/chat/ConversationList';
import { EnhancedChatPanel } from '@/components/chat/EnhancedChatPanel';
import { FirebaseUsageMonitor } from '@/components/FirebaseUsageMonitor';
import { Conversation } from '@/types/chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { 
  MessageCircle, 
  Users, 
  Clock, 
  TrendingUp,
  RefreshCw,
  Settings
} from 'lucide-react';

const ChatDashboard: React.FC = () => {
  const { isBusinessOwner, userProfile } = useAuth();
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  
  const {
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
  } = useOptimizedChatService(activeConversation?.id);

  const handleConversationSelect = (conversation: Conversation) => {
    setActiveConversation(conversation);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;
    await sendMessage(activeConversation.id, content);
  };

  const handleMarkAsRead = async (messageId: string) => {
    await markAsRead(messageId);
  };

  const handleSetTyping = async (isTyping: boolean) => {
    if (!activeConversation) return;
    await setTyping(activeConversation.id, isTyping);
  };

  const handleLoadMoreMessages = async () => {
    if (!activeConversation) return;
    await loadMoreMessages(activeConversation.id);
  };

  const handleCloseChatPanel = () => {
    setActiveConversation(null);
  };

  // Statistics
  const activeConversations = conversations.filter(c => c.status === 'active').length;
  const pendingConversations = conversations.filter(c => c.status === 'pending').length;
  const totalUnreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const onlineOperators = Object.values(presence).filter(p => p.status === 'online').length;

  const stats = [
    {
      title: 'Active Chats',
      value: activeConversations,
      icon: MessageCircle,
      variant: 'default' as const,
    },
    {
      title: 'Pending',
      value: pendingConversations,
      icon: Clock,
      variant: 'secondary' as const,
    },
    {
      title: 'Unread Messages',
      value: totalUnreadMessages,
      icon: TrendingUp,
      variant: 'destructive' as const,
    },
    ...(isBusinessOwner ? [{
      title: 'Online Operators',
      value: onlineOperators,
      icon: Users,
      variant: 'default' as const,
    }] : []),
  ];

  if (loading) {
    return (
      <DashboardLayout title="Chat Dashboard" subtitle="Manage customer conversations">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Chat Dashboard" subtitle="Manage customer conversations">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Error loading chat data: {error}</p>
            <Button onClick={refreshConversations} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout 
      title="Chat Dashboard" 
      subtitle={`Welcome ${userProfile?.displayName || 'User'} - ${userProfile?.role === 'business_owner' ? 'Business Owner' : 'Operator'}`}
    >
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </p>
                  </div>
                  <Badge variant={stat.variant} className="p-2">
                    <stat.icon className="h-4 w-4" />
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* Conversation List */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversations</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshConversations}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {isBusinessOwner && (
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex flex-col h-full">
              <ConversationList
                conversations={conversations}
                presence={presence}
                activeConversationId={activeConversation?.id}
                onConversationSelect={handleConversationSelect}
                className="flex-1"
              />
            </CardContent>
          </Card>

          {/* Chat Panel */}
          <div className="lg:col-span-2">
            {activeConversation ? (
              <EnhancedChatPanel
                conversation={activeConversation}
                messages={messages[activeConversation.id] || []}
                presence={presence}
                onSendMessage={handleSendMessage}
                onMarkAsRead={handleMarkAsRead}
                onSetTyping={handleSetTyping}
                onLoadMoreMessages={handleLoadMoreMessages}
                isOpen={true}
                onClose={handleCloseChatPanel}
              />
            ) : (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Select a Conversation
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Choose a conversation from the list to start chatting with customers
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Business Owner Additional Features */}
        {isBusinessOwner && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {conversations.slice(0, 5).map((conversation) => (
                    <div key={conversation.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full" />
                        <span className="text-sm font-medium">
                          {conversation.customerName || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {conversation.lastMessageAt.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Response Rate</span>
                    <span className="font-medium">98.5%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Response Time</span>
                    <span className="font-medium">2.3 min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Customer Satisfaction</span>
                    <span className="font-medium">4.8/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Active Operators</span>
                    <span className="font-medium">{onlineOperators}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Firebase Usage Monitor */}
            <FirebaseUsageMonitor 
              usageStats={usageStats}
              maxReadsPerDay={5000}
              maxWritesPerDay={2500}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ChatDashboard;