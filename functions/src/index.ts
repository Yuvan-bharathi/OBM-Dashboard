import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { WhatsAppService } from './whatsappService';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';

// Initialize Firebase Admin
initializeApp();

export const sendWhatsAppMessage = onCall({
  cors: {
    origin: true,
    methods: ['POST', 'OPTIONS']
  }
}, async (request) => {
  // Log the request origin for debugging
  logger.info('Incoming request origin', {
    origin: request.rawRequest?.headers?.origin || 'unknown',
    method: request.rawRequest?.method || 'unknown'
  });
  try {
    // Validate request data
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

    // Get WhatsApp credentials from environment
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
      hasCredentials: true
    });

    // Initialize WhatsApp service
    const whatsappService = new WhatsAppService(phoneNumberId, whatsappToken);
    
    // Send message via WhatsApp API
    const whatsappResponse = await whatsappService.sendMessage(to, message);

    logger.info('WhatsApp message sent successfully', {
      messageId: whatsappResponse.messages[0]?.id,
      contactId: whatsappResponse.contacts[0]?.wa_id
    });

    return {
      success: true,
      messageId: whatsappResponse.messages[0]?.id,
      contactId: whatsappResponse.contacts[0]?.wa_id
    };

  } catch (error) {
    logger.error('Failed to send WhatsApp message', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Handle WhatsApp API errors
    if (error instanceof Error && error.message.includes('WhatsApp API Error')) {
      throw new HttpsError('internal', `WhatsApp API Error: ${error.message}`);
    }
    
    throw new HttpsError('internal', 'Failed to send WhatsApp message');
  }
});


export const sendWhatsAppMessageHttp = onRequest({
  cors: {
    origin: "*",
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  invoker: 'public'
}, async (req, res) => {
  // Set comprehensive CORS headers immediately
  const origin = req.get('Origin') || req.get('origin') || '';
  
  // Log for debugging
  logger.info('HTTP request origin check', { 
    origin, 
    method: req.method,
    headers: req.headers 
  });
  
  // Set CORS headers for all responses
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.set('Access-Control-Max-Age', '86400');
  res.set('Vary', 'Origin');

  // Handle preflight OPTIONS request immediately
  if (req.method === 'OPTIONS') {
    logger.info('Handling preflight OPTIONS request', { origin });
    res.status(204).send('');
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    logger.info('Incoming HTTP request origin', { origin });

    // Verify authentication
    const authHeader = req.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
      return;
    }

    const idToken = authHeader.split('Bearer ')[1];
    await getAuth().verifyIdToken(idToken);

    // Validate request data
    const { to, message } = req.body;
    
    if (!to || !message) {
      res.status(400).json({ error: 'Missing required fields: to, message' });
      return;
    }

    if (typeof to !== 'string' || typeof message !== 'string') {
      res.status(400).json({ error: 'Invalid field types: to and message must be strings' });
      return;
    }

    if (message.trim().length === 0) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    // Get WhatsApp credentials from environment
    const whatsappToken = process.env.WHATSAPP_API_TOKEN || process.env.VITE_WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || process.env.VITE_WHATSAPP_PHONE_NUMBER_ID;

    if (!whatsappToken || !phoneNumberId) {
      logger.error('WhatsApp credentials not configured', {
        hasToken: !!whatsappToken,
        hasPhoneId: !!phoneNumberId
      });
      res.status(500).json({ error: 'WhatsApp API credentials not configured on server' });
      return;
    }

    logger.info('Sending WhatsApp message via HTTP', {
      to: to.replace(/\d/g, '*'), // Mask phone number for privacy
      messageLength: message.length,
      hasCredentials: true
    });

    // Initialize WhatsApp service
    const whatsappService = new WhatsAppService(phoneNumberId, whatsappToken);
    
    // Send message via WhatsApp API
    const whatsappResponse = await whatsappService.sendMessage(to, message);

    logger.info('WhatsApp message sent successfully via HTTP', {
      messageId: whatsappResponse.messages[0]?.id,
      contactId: whatsappResponse.contacts[0]?.wa_id
    });

    res.status(200).json({
      success: true,
      messageId: whatsappResponse.messages[0]?.id,
      contactId: whatsappResponse.contacts[0]?.wa_id
    });

  } catch (error) {
    logger.error('Failed to send WhatsApp message via HTTP', error);
    
    // Handle WhatsApp API errors
    if (error instanceof Error && error.message.includes('WhatsApp API Error')) {
      res.status(500).json({ error: `WhatsApp API Error: ${error.message}` });
      return;
    }
    
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});