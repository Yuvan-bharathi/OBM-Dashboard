interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export class WhatsAppService {
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';
  private phoneNumberId: string;
  private accessToken: string;

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
  }

  async sendMessage(to: string, message: string): Promise<WhatsAppResponse> {
    // Format phone number (remove any non-digits and ensure it starts with country code)
    const formattedPhone = to.replace(/\D/g, '');
    
    const messageData: WhatsAppMessage = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: message
      }
    };

    const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`WhatsApp API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    return response.json();
  }

  static formatPhoneNumber(phone: string): string {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // If it doesn't start with country code, assume it's a local number
    // You may need to adjust this based on your region
    if (!cleaned.startsWith('1') && cleaned.length === 10) {
      cleaned = '1' + cleaned; // Add US country code as default
    }
    
    return cleaned;
  }
}