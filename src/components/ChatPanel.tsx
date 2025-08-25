import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X, Phone, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  message: string;
  sender: 'customer' | 'operator';
  timestamp: string;
  phone_number?: string;
  name?: string;
}

interface Customer {
  phone: string;
  name: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  initialMessages: ChatMessage[];
  webhookUrl: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  customer,
  initialMessages,
  webhookUrl
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-refresh messages every 5 seconds
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(webhookUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            const customerMessages = data
              .filter(msg => msg.phone_number === customer.phone)
              .map((msg, index) => ({
                id: `webhook-${Date.now()}-${index}`,
                message: msg.Message || msg.message || '',
                sender: 'customer' as const,
                timestamp: new Date().toISOString(),
                phone_number: msg.phone_number,
                name: msg.name || msg.Name || customer.name,
              }));

            // Add only new messages (basic deduplication)
            const newMessages = customerMessages.filter(newMsg => 
              !messages.some(existingMsg => 
                existingMsg.message === newMsg.message && 
                existingMsg.sender === 'customer' &&
                Math.abs(new Date(existingMsg.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 60000
              )
            );

            if (newMessages.length > 0) {
              setMessages(prev => [...prev, ...newMessages]);
            }
          }
        }
      } catch (error) {
        console.log('Auto-refresh failed:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, customer.phone, webhookUrl, messages]);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    
    // Create the message object
    const messageToSend = {
      id: `operator-${Date.now()}`,
      message: newMessage.trim(),
      sender: 'operator' as const,
      timestamp: new Date().toISOString(),
      phone_number: customer.phone,
      name: 'Operator'
    };

    // Add message to chat immediately
    setMessages(prev => [...prev, messageToSend]);
    setNewMessage('');

    try {
      // Send to n8n webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: customer.phone,
          name: customer.name,
          message: messageToSend.message,
          sender: 'operator',
          timestamp: messageToSend.timestamp,
          type: 'reply'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      toast({
        title: "Message sent",
        description: "Your reply has been sent successfully.",
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: "Failed to send",
        description: "There was an error sending your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="h-full flex flex-col bg-background border-l border-border animate-slide-in-right">
      {/* Header */}
      <div className="p-4 bg-primary text-primary-foreground border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary-foreground text-primary">
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-base font-medium text-primary-foreground">
                {customer.name}
              </h3>
              <div className="flex items-center space-x-1 text-xs text-primary-foreground/80">
                <Phone className="h-3 w-3" />
                <span>{customer.phone}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-gradient-to-b from-muted/20 to-muted/5" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'operator' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    message.sender === 'operator'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border rounded-bl-sm'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'operator' 
                      ? 'text-primary-foreground/70' 
                      : 'text-muted-foreground'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || isSending}
            size="icon"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};