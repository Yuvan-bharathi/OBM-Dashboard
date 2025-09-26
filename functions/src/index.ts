import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { WhatsAppService } from './whatsappService';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin
initializeApp();

export const sendWhatsAppMessage = onCall({
  cors: true // Automatically handle CORS for all origins
}, async (request) => {
  // 1. Authenticate the user
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Log the request for debugging
  logger.info('Incoming authenticated request', {
    uid: request.auth.uid,
    origin: request.rawRequest?.headers?.origin || 'unknown',
  });

  try {
    // 2. Validate request data
    const { to, message } = request.data;
    
    if (!to || !message) {
      throw new HttpsError('invalid-argument', 'Missing required fields: to, message');
    }

    if (typeof to !== 'string' || typeof message !== 'string') {
      throw new HttpsError('invalid-argument', 'Invalid field types: to and message must be strings');
    }

    if (message.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Message cannot be empty');
    }

    // 3. Get WhatsApp credentials from environment
    const whatsappToken = process.env.WHATSAPP_API_TOKEN || process.env.VITE_WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.VITE_WHATSAPP_PHONE_NUMBER_ID;

    if (!whatsappToken || !phoneNumberId) {
      logger.error('WhatsApp credentials not configured', {
        hasToken: !!whatsappToken,
        hasPhoneId: !!phoneNumberId
      });
      throw new HttpsError('failed-precondition', 'WhatsApp API credentials not configured on server');
    }

    logger.info('Sending WhatsApp message', {
      to: to.replace(/\d/g, '*'), // Mask phone number for privacy
      messageLength: message.length,
    });

    // 4. Initialize WhatsApp service and send message
    const whatsappService = new WhatsAppService(phoneNumberId, whatsappToken);
    const whatsappResponse = await whatsappService.sendMessage(to, message);

    logger.info('WhatsApp message sent successfully', {
      messageId: whatsappResponse.messages[0]?.id,
    });

    return {
      success: true,
      messageId: whatsappResponse.messages[0]?.id,
    };

  } catch (error) {
    logger.error('Failed to send WhatsApp message', {
      error,
      uid: request.auth.uid
    });
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    if (error instanceof Error && error.message.includes('WhatsApp API Error')) {
      throw new HttpsError('internal', `WhatsApp API Error: ${error.message}`);
    }
    
    throw new HttpsError('internal', 'An unexpected error occurred while sending the message.');
  }
});