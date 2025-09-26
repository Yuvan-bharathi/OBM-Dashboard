import { ChatService } from './chatService';
import { ChatMessage } from '@/types/chat';

export interface WebhookMessage {
  conversationId: string;
  phone_number: number | string;
  name: string;
  message: string;
  sender: 'operator' | 'customer';
  timestamp: string;
  type: 'reply' | 'message';
}

export class WebhookChatService {
  /**
   * Convert webhook message data to ChatMessage format and store in Firebase
   */
  static async processWebhookMessage(webhookData: WebhookMessage): Promise<ChatMessage> {
    const conversationId = String(webhookData.conversationId || webhookData.phone_number);
    const phoneNumber = String(webhookData.phone_number);
    
    // Create or get conversation
    let conversation = await ChatService.getConversation(conversationId);
    
    if (!conversation) {
      // Create new conversation using phone number as ID
      conversation = await ChatService.createConversation(
        phoneNumber, // customerId = phone number for simplicity
        webhookData.name,
        phoneNumber
      );
    }

    // Send message through ChatService
    const message = await ChatService.sendMessage(
      conversationId,
      webhookData.sender === 'operator' ? 'operator' : phoneNumber,
      webhookData.sender,
      webhookData.message,
      'text'
    );

    return message;
  }

  /**
   * Create conversation if it doesn't exist based on phone number
   */
  static async getOrCreateConversationByPhone(
    phoneNumber: string,
    customerName: string
  ): Promise<string> {
    // Use phone number as conversation ID
    const conversationId = phoneNumber;
    
    let conversation = await ChatService.getConversation(conversationId);
    
    if (!conversation) {
      conversation = await ChatService.createConversation(
        phoneNumber,
        customerName,
        phoneNumber
      );
    }

    return conversation.id;
  }

  /**
   * Convert Firebase messages to webhook format for n8n
   */
  static convertToWebhookFormat(message: ChatMessage, customerName: string, phoneNumber: string): WebhookMessage {
    return {
      conversationId: message.conversationId,
      phone_number: phoneNumber,
      name: customerName,
      message: message.content,
      sender: message.senderType,
      timestamp: message.timestamp.toISOString(),
      type: message.senderType === 'operator' ? 'reply' : 'message'
    };
  }
}