import { useState, useEffect, useCallback } from 'react';
import { useFirestoreCollection } from './useFirestore';
import { useGoogleSheets } from './useGoogleSheets';
import { orderBy } from 'firebase/firestore';
import { defaultDataSourceConfig, DataSource } from '@/config/dataSources';
import { OptimizedChatService } from '@/services/optimizedChatService';

// Optimized Data Sources Hook with Circuit Breaker
export interface UnifiedMessage {
  id: string;
  phone_number: string;
  name: string;
  product: string;
  category: string;
  intent: string;
  message: string;
  timestamp: Date;
  source: DataSource;
  sender: 'operator' | 'customer';
  direction: 'inbound' | 'outbound';
  type: string;
}

interface WebhookMessage {
  phone_number: string;
  name: string;
  product?: string;
  Product?: string;
  category?: string;
  Category?: string;
  intent?: string;
  Intent?: string;
  message?: string;
  Message?: string;
  id?: string;
  timestamp?: string;
}

export const useOptimizedDataSources = () => {
  const [webhookMessages, setWebhookMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const config = defaultDataSourceConfig;

  // Check Firebase rate limit
  const checkRateLimit = useCallback(() => {
    const canProceed = OptimizedChatService.checkRateLimit();
    setIsRateLimited(!canProceed);
    return canProceed;
  }, []);

  // Firebase integration with circuit breaker
  const { 
    data: firebaseData, 
    loading: firebaseLoading, 
    error: firebaseError,
    refetch: refetchFirebase
  } = useFirestoreCollection(
    config.settings.firebase.collectionName,
    [orderBy('Time', 'desc')],
    config.enabled.includes(DataSource.FIREBASE) && !isRateLimited,
    100, // Increased limit for Firebase-only dashboard display
    0   // No time constraint to prevent updatedAt filter
  );

  // 🚨 EMERGENCY: Google Sheets temporarily disabled to reduce load
  const { 
    data: sheetsData, 
    loading: sheetsLoading, 
    error: sheetsError,
    refetch: refetchSheets 
  } = useGoogleSheets({
    spreadsheetId: config.settings.googleSheets.spreadsheetId,
    sheetName: config.settings.googleSheets.sheetName,
    range: config.settings.googleSheets.range,
    apiKey: config.settings.googleSheets.apiKey,
    enabled: false // 🚨 EMERGENCY: Temporarily disabled
  });

  // Convert Firebase data to unified format
  const getFirebaseMessages = useCallback((): UnifiedMessage[] => {
    if (!config.enabled.includes(DataSource.FIREBASE) || !firebaseData || isRateLimited) {
      return [];
    }
    
  return firebaseData.slice(0, 100).map((doc, index) => { // Increased limit for better dashboard display
      // Handle timestamp - prioritize the actual Firebase field names from screenshot
      let timestamp = new Date();
      if (doc.ReceivedAt?.toDate) {
        // Firestore Timestamp object for ReceivedAt
        timestamp = doc.ReceivedAt.toDate();
      } else if (doc.ReceivedAt?.seconds) {
        // Handle Firestore timestamp with seconds field
        timestamp = new Date(doc.ReceivedAt.seconds * 1000);
      } else if (typeof doc.ReceivedAt === 'string') {
        // Direct ReceivedAt field from Firebase (string format)
        timestamp = new Date(doc.ReceivedAt);
      } else if (doc.Time?.toDate) {
        // Fallback to Time field
        timestamp = doc.Time.toDate();
      } else if (doc.Time?.seconds) {
        timestamp = new Date(doc.Time.seconds * 1000);
      } else if (typeof doc.Time === 'string') {
        timestamp = new Date(doc.Time);
      } else if (doc.time?.seconds) {
        timestamp = new Date(doc.time.seconds * 1000);
      } else if (doc.timestamp?.toDate) {
        timestamp = doc.timestamp.toDate();
      } else if (doc.createdAt?.toDate) {
        timestamp = doc.createdAt.toDate();
      } else if (doc.updatedAt) {
        timestamp = new Date(doc.updatedAt);
      }
      
      // Handle phone number - prioritize Firebase field names from screenshot
      const phone_number = String(doc["Phone Number"] || doc.phone_number || doc.Phone_number || 'N/A');
      
      // Handle name - prioritize Firebase field names from screenshot
      const name = doc["Profile Name"] || doc.name || doc.Name || doc.customer_name || doc.Customer_name || 'Unknown Customer';
      
      // Handle product with fallbacks
      const product = doc.product || doc.Product || 'No product specified';
      
      // Handle category with fallbacks
      const category = doc.category || doc.Category || 'Enquiry';
      
      // Handle intent with fallbacks
      const intent = doc.intent || doc.Intent || 'General';
      
      // Handle message - prioritize Firebase field names from screenshot
      const message = doc.Message || doc.message || doc.Message_body || doc.message_body || 'No message content';
      
      // Handle sender - map from Firebase Sender field
      const senderValue = doc.Sender || doc.sender || 'Customer';
      const sender = senderValue.toLowerCase() === 'operator' ? 'operator' : 'customer';
      
      // Handle direction based on sender
      const direction = sender === 'operator' ? 'outbound' : 'inbound';
      
      // Handle type - use Firebase Type field or default
      const type = doc.Type || doc.type || 'text';
      
      return {
        id: doc.id || `firebase-${Date.now()}-${index}`,
        phone_number,
        name,
        product,
        category,
        intent,
        message,
        timestamp,
        source: DataSource.FIREBASE,
        sender,
        direction,
        type
      };
    });
  }, [firebaseData, config.enabled, isRateLimited]);

  // Convert Google Sheets data to unified format
  const getSheetsMessages = useCallback((): UnifiedMessage[] => {
    if (!config.enabled.includes(DataSource.GOOGLE_SHEETS) || !sheetsData) return [];
    
    return sheetsData.slice(0, 15).map((row, index) => ({ // Limit to 15 for preview
      id: row.id || `sheets-${Date.now()}-${index}`,
      phone_number: String(row.phone_number || ''),
      name: row.name || '',
      product: row.product || row.Product || '',
      category: row.category || row.Category || '',
      intent: row.intent || row.Intent || '',
      message: row.message || row.Message || '',
      timestamp: new Date(row.timestamp || new Date().toISOString()),
      source: DataSource.GOOGLE_SHEETS,
      sender: 'customer' as const,
      direction: 'inbound' as const,
      type: 'text'
    }));
  }, [sheetsData, config.enabled]);

  // Check if message already exists
  const isDuplicateMessage = useCallback((newMsg: WebhookMessage, existingMessages: UnifiedMessage[]): boolean => {
    return existingMessages.some(existing => 
      existing.phone_number === newMsg.phone_number && 
      existing.message === (newMsg.message || newMsg.Message) &&
      existing.product === (newMsg.product || newMsg.Product)
    );
  }, []);

  // 🚨 EMERGENCY: Disabled webhook fetch temporarily to reduce requests
  const fetchWebhookData = useCallback(async () => {
    if (!config.enabled.includes(DataSource.WEBHOOK)) return;

    // 🚨 TEMPORARY DISABLE: Webhook is causing CORS errors and excessive requests
    console.log('🚨 Webhook temporarily disabled to reduce Firebase load');
    setConnectionStatus('error');
    setIsLoading(false);
    return;

    // Original code commented out to stop the CORS retry loop
    /*
    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      const response = await fetch(config.settings.webhook.url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors',
        body: JSON.stringify({
          type: 'fetch_messages',
          limit: 20
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: WebhookMessage[] = await response.json();
      const messagesArray = Array.isArray(data) ? data.slice(0, 20) : [data];
      
      const allExistingMessages = getAllMessages();
      const newMessages = messagesArray.filter(msg => !isDuplicateMessage(msg, allExistingMessages));
      
      if (newMessages.length > 0) {
        const processedNewMessages: UnifiedMessage[] = newMessages.map((msg, index) => ({
          id: msg.id || `webhook-${Date.now()}-${index}`,
          phone_number: String(msg.phone_number || ''),
          name: msg.name || '',
          product: msg.product || msg.Product || '',
          category: msg.category || msg.Category || '',
          intent: msg.intent || msg.Intent || '',
          message: msg.message || msg.Message || '',
          timestamp: new Date(msg.timestamp || new Date().toISOString()),
          source: DataSource.WEBHOOK,
          sender: 'customer' as const,
          direction: 'inbound' as const,
          type: 'text'
        }));

        setWebhookMessages(prev => [...processedNewMessages, ...prev.slice(0, 15)]);
      }
      
      setLastFetchTime(new Date());
      setConnectionStatus('connected');
    } catch (error) {
      console.error('[WEBHOOK] Failed to fetch data:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
    */
  }, [config]);

  // Get all messages from all enabled sources
  const getAllMessages = useCallback((): UnifiedMessage[] => {
    const messages: UnifiedMessage[] = [];
    
    if (config.enabled.includes(DataSource.WEBHOOK)) {
      messages.push(...webhookMessages.slice(0, 15));
    }
    
    if (config.enabled.includes(DataSource.FIREBASE) && !isRateLimited) {
      messages.push(...getFirebaseMessages());
    }
    
    if (config.enabled.includes(DataSource.GOOGLE_SHEETS)) {
      messages.push(...getSheetsMessages());
    }

    return messages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 100); // Increased limit for Firebase-only dashboard display
  }, [webhookMessages, getFirebaseMessages, getSheetsMessages, config.enabled, isRateLimited]);

  // Refresh all data sources
  const refreshAllSources = useCallback(async () => {
    // Check rate limit first
    if (!checkRateLimit()) {
      console.warn('Rate limited, skipping refresh');
      return;
    }

    const promises = [];
    
    if (config.enabled.includes(DataSource.WEBHOOK)) {
      promises.push(fetchWebhookData());
    }
    
    if (config.enabled.includes(DataSource.GOOGLE_SHEETS)) {
      promises.push(refetchSheets());
    }
    
    if (config.enabled.includes(DataSource.FIREBASE) && refetchFirebase) {
      promises.push(refetchFirebase());
    }
    
    await Promise.allSettled(promises);
  }, [fetchWebhookData, refetchSheets, config.enabled, checkRateLimit]);

  // 🚨 EMERGENCY: Disabled automatic polling - Manual refresh only
  useEffect(() => {
    if (!config.enabled.includes(DataSource.WEBHOOK)) return;

    // Single fetch on mount only, NO automatic polling
    fetchWebhookData();
    
    // NO INTERVAL - Manual refresh only to stop excessive requests
  }, [fetchWebhookData, config.enabled]);

  // 🚨 EMERGENCY: Reduced rate limit monitoring frequency
  useEffect(() => {
    const interval = setInterval(checkRateLimit, 120000); // Check every 2 minutes instead of 30 seconds
    return () => clearInterval(interval);
  }, [checkRateLimit]);

  const isLoadingAny = isLoading || 
    (config.enabled.includes(DataSource.FIREBASE) && firebaseLoading && !isRateLimited) ||
    (config.enabled.includes(DataSource.GOOGLE_SHEETS) && sheetsLoading);

  const hasError = connectionStatus === 'error' ||
    (config.enabled.includes(DataSource.FIREBASE) && firebaseError && !isRateLimited) ||
    (config.enabled.includes(DataSource.GOOGLE_SHEETS) && sheetsError);

  return {
    messages: getAllMessages(),
    webhookMessages: webhookMessages.slice(0, 15),
    firebaseMessages: getFirebaseMessages(),
    sheetsMessages: getSheetsMessages(),
    isLoading: isLoadingAny,
    connectionStatus: hasError ? 'error' : connectionStatus,
    lastFetchTime,
    refreshAllSources,
    fetchWebhookData,
    enabledSources: config.enabled,
    primarySource: config.primary,
    secondarySource: config.secondary,
    isRateLimited,
    usageStats: OptimizedChatService.getUsageStats()
  };
};