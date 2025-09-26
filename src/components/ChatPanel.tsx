import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, X, Phone, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/contexts/AuthContext';

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
  webhookUrl?: string; // Now optional since we're using WhatsApp API
  onMessageSent?: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  customer,
  initialMessages,
  webhookUrl,
  onMessageSent
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  // Sync with initialMessages when they change and merge with local messages by ID
  useEffect(() => {
    const sortedInitial = [...initialMessages].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    // Merge messages by ID to preserve local messages
    setMessages(prev => {
      const messageMap = new Map();
      
      // Add initial messages first
      sortedInitial.forEach(msg => messageMap.set(msg.id, msg));
      
      // Add or update with previous messages (preserves local messages)
      prev.forEach(msg => {
        if (!messageMap.has(msg.id)) {
          messageMap.set(msg.id, msg);
        }
      });
      
      return Array.from(messageMap.values()).sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    });
  }, [initialMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-refresh disabled - Messages come from Firebase via dashboard
  // Chat component only sends messages to webhook, doesn't fetch from it
  /*
  useEffect(() => {
    console.log('ChatPanel: Auto-refresh webhook polling disabled - using Firebase data flow');
    // Webhook polling removed to prevent CORS errors and data conflicts
    // Messages are displayed via Firebase after webhook processing
  }, [isOpen, customer.phone, webhookUrl, messages]);
  */

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
      let response: {
        success: boolean;
        messageId: string;
        contactId: string;
      };

      try {
        // Try Firebase Callable first (more reliable)
        const functions = getFunctions(undefined, 'us-central1');
        const sendWhatsAppMessage = httpsCallable(functions, 'sendWhatsAppMessage');
        const result = await sendWhatsAppMessage({
          to: customer.phone,
          message: messageToSend.message
        });
        response = result.data as {
          success: boolean;
          messageId: string;
          contactId: string;
        };
      } catch (callableError) {
        console.warn('Firebase Callable failed, trying HTTP endpoint:', callableError);

        // Fallback to HTTP endpoint
        if (!currentUser) {
          throw new Error('Authentication required');
        }
        const idToken = await currentUser.getIdToken();
        const httpResponse = await fetch('https://us-central1-order-booking-manager.cloudfunctions.net/sendWhatsAppMessageHttp', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            to: customer.phone,
            message: messageToSend.message
          }),
          mode: 'cors',
          credentials: 'omit'
        });

        if (!httpResponse.ok) {
          const errorData = await httpResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'HTTP request failed');
        }

        response = await httpResponse.json();
      }

      // Save message to Firebase
      await addDoc(collection(db, 'messages'), {
        id: messageToSend.id,
        message: messageToSend.message,
        sender: messageToSend.sender,
        timestamp: serverTimestamp(),
        phone_number: customer.phone,
        name: messageToSend.name,
        category: 'chat',
        whatsapp_message_id: response.messageId,
        delivery_status: 'sent'
      });

      // Trigger refresh of data sources
      if (onMessageSent) {
        onMessageSent();
      }

      toast({
        title: "Message sent",
        description: "Your reply has been sent via WhatsApp successfully.",
      });
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error);
      
      // Remove the message from UI if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== messageToSend.id));
      setNewMessage(messageToSend.message); // Restore the message text
      
      let errorMessage = "There was an error sending your WhatsApp message. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('credentials not configured')) {
          errorMessage = "WhatsApp API is not configured. Please contact your administrator.";
        } else if (error.message.includes('WhatsApp API Error')) {
          errorMessage = `WhatsApp Error: ${error.message.split(' - ')[1] || 'Unknown error'}`;
        } else if (error.message.includes('functions/')) {
          // Firebase Functions error
          const functionError = error.message.split('functions/')[1];
          if (functionError.includes('failed-precondition')) {
            errorMessage = "WhatsApp API is not configured on the server. Please contact your administrator.";
          } else if (functionError.includes('invalid-argument')) {
            errorMessage = "Invalid message format. Please try again.";
          } else {
            errorMessage = "Server error occurred. Please try again.";
          }
        }
      }
      
      toast({
        title: "Failed to send",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            <>
              {messages.map((message) => (
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
              ))}
              <div ref={bottomRef} />
            </>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center space-x-2">
          <Input
            id="chat-panel-input"
            name="chatMessage"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
            aria-label="Type a message to send"
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