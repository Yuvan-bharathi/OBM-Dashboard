import { useState, useEffect, useCallback } from 'react';
import { useFirestoreCollection } from './useFirestore';
import { useGoogleSheets } from './useGoogleSheets';
import { defaultDataSourceConfig, DataSource } from '@/config/dataSources';

// Unified Data Sources Hook
// This hook combines data from Webhook, Firebase, and Google Sheets based on configuration

export interface UnifiedMessage {
  id: string;
  phone_number: string;
  name: string;
  product: string;
  category: string;
  intent: string;
  message: string;
  timestamp: Date;
  source: DataSource; // Track which source the message came from
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

export const useDataSources = () => {
  const [webhookMessages, setWebhookMessages] = useState<UnifiedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);

  const config = defaultDataSourceConfig;

  // Firebase integration
  const { 
    data: firebaseData, 
    loading: firebaseLoading, 
    error: firebaseError 
  } = useFirestoreCollection(
    config.settings.firebase.collectionName,
    [],
    config.enabled.includes(DataSource.FIREBASE)
  );

  // Google Sheets integration
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
    enabled: config.enabled.includes(DataSource.GOOGLE_SHEETS)
  });

  // Check if message already exists (duplicate prevention across all sources)
  const isDuplicateMessage = useCallback((newMsg: WebhookMessage, existingMessages: UnifiedMessage[]): boolean => {
    return existingMessages.some(existing => 
      existing.phone_number === newMsg.phone_number && 
      existing.message === (newMsg.message || newMsg.Message) &&
      existing.product === (newMsg.product || newMsg.Product)
    );
  }, []);

  // Fetch data from webhook
  const fetchWebhookData = useCallback(async () => {
    if (!config.enabled.includes(DataSource.WEBHOOK)) return;

    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      // Try GET request first
      let response = await fetch(config.settings.webhook.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        mode: 'cors'
      });
      
      // If GET fails, try POST
      if (!response.ok) {
        response = await fetch(config.settings.webhook.url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
          body: JSON.stringify({})
        });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: WebhookMessage[] = await response.json();
      const messagesArray = Array.isArray(data) ? data : [data];
      
      // Get all existing messages from all sources for duplicate checking
      const allExistingMessages = getAllMessages();
      
      // Filter out duplicates
      const newMessages = messagesArray.filter(msg => !isDuplicateMessage(msg, allExistingMessages));
      
      if (newMessages.length > 0) {
        const processedNewMessages: UnifiedMessage[] = newMessages.map((msg, index) => ({
          id: msg.id || `webhook-${Date.now()}-${index}`,
          phone_number: msg.phone_number || '',
          name: msg.name || '',
          product: msg.product || msg.Product || '',
          category: msg.category || msg.Category || '',
          intent: msg.intent || msg.Intent || '',
          message: msg.message || msg.Message || '',
          timestamp: new Date(msg.timestamp || new Date().toISOString()),
          source: DataSource.WEBHOOK
        }));

        setWebhookMessages(prev => [...prev, ...processedNewMessages]);
        console.log(`[WEBHOOK] Added ${processedNewMessages.length} new messages`);
      }
      
      setLastFetchTime(new Date());
      setConnectionStatus('connected');
    } catch (error) {
      console.error('[WEBHOOK] Failed to fetch data:', error);
      setConnectionStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [config, isDuplicateMessage]);

  // Convert Firebase data to unified format
  const getFirebaseMessages = useCallback((): UnifiedMessage[] => {
    if (!config.enabled.includes(DataSource.FIREBASE) || !firebaseData) {
      console.log('🔥 Firebase not enabled or no data:', { enabled: config.enabled.includes(DataSource.FIREBASE), dataLength: firebaseData?.length });
      return [];
    }
    
    console.log('🔥 Converting Firebase data to unified format:', firebaseData);
    
    const converted = firebaseData.map((doc, index) => {
      console.log('🔥 Processing Firebase document:', doc);
      
      // Handle timestamp - provide fallback if missing
      let timestamp = new Date();
      if (doc.timestamp?.toDate) {
        timestamp = doc.timestamp.toDate();
      } else if (doc.createdAt?.toDate) {
        timestamp = doc.createdAt.toDate();
      } else if (doc.updatedAt) {
        timestamp = new Date(doc.updatedAt);
      }
      
      const message: UnifiedMessage = {
        id: doc.id || `firebase-${Date.now()}-${index}`,
        phone_number: doc.phone_number || '',
        name: doc.name || doc.customer_name || 'Unknown',
        product: doc.product || '',
        category: doc.category || 'enquiry',
        intent: doc.intent || 'general',
        message: doc.message || doc.message_body || '',
        timestamp: timestamp,
        source: DataSource.FIREBASE
      };
      
      console.log('🔥 Converted Firebase message:', {
        id: message.id,
        category: message.category,
        message: message.message,
        timestamp: message.timestamp
      });
      
      console.log('🔥 Converted Firebase message:', message);
      return message;
    });
    
    console.log('🔥 All converted Firebase messages:', converted);
    return converted;
  }, [firebaseData, config.enabled]);

  // Convert Google Sheets data to unified format
  const getSheetsMessages = useCallback((): UnifiedMessage[] => {
    if (!config.enabled.includes(DataSource.GOOGLE_SHEETS) || !sheetsData) return [];
    
    return sheetsData.map((row, index) => ({
      id: row.id || `sheets-${Date.now()}-${index}`,
      phone_number: row.phone_number || '',
      name: row.name || '',
      product: row.product || row.Product || '',
      category: row.category || row.Category || '',
      intent: row.intent || row.Intent || '',
      message: row.message || row.Message || '',
      timestamp: new Date(row.timestamp || new Date().toISOString()),
      source: DataSource.GOOGLE_SHEETS
    }));
  }, [sheetsData, config.enabled]);

  // Get all messages from all enabled sources
  const getAllMessages = useCallback((): UnifiedMessage[] => {
    console.log('🔄 Combining messages from all sources...');
    console.log('📊 Enabled sources:', config.enabled);
    console.log('🌐 Webhook messages count:', webhookMessages.length);
    console.log('🔥 Firebase data count:', firebaseData?.length || 0);
    console.log('📊 Sheets data count:', sheetsData?.length || 0);
    
    const messages: UnifiedMessage[] = [];
    
    if (config.enabled.includes(DataSource.WEBHOOK)) {
      console.log('✅ Adding webhook messages');
      messages.push(...webhookMessages);
    }
    
    if (config.enabled.includes(DataSource.FIREBASE)) {
      console.log('✅ Adding Firebase messages');
      const firebaseMessages = getFirebaseMessages();
      messages.push(...firebaseMessages);
    }
    
    if (config.enabled.includes(DataSource.GOOGLE_SHEETS)) {
      console.log('✅ Adding sheets messages');
      messages.push(...getSheetsMessages());
    }

    console.log('📋 Total combined messages:', messages.length);
    
    // Sort by timestamp (newest first)
    const sortedMessages = messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    console.log('📋 Final sorted messages:', sortedMessages);
    
    return sortedMessages;
  }, [webhookMessages, getFirebaseMessages, getSheetsMessages, config.enabled, firebaseData, sheetsData]);

  // Refresh all data sources
  const refreshAllSources = useCallback(async () => {
    const promises = [];
    
    if (config.enabled.includes(DataSource.WEBHOOK)) {
      promises.push(fetchWebhookData());
    }
    
    if (config.enabled.includes(DataSource.GOOGLE_SHEETS)) {
      promises.push(refetchSheets());
    }
    
    // Firebase updates automatically via real-time listeners
    
    await Promise.allSettled(promises);
  }, [fetchWebhookData, refetchSheets, config.enabled]);

  // Set up webhook polling
  useEffect(() => {
    if (!config.enabled.includes(DataSource.WEBHOOK)) return;

    // Initial fetch
    fetchWebhookData();
    
    // Set up polling
    const interval = setInterval(fetchWebhookData, config.settings.webhook.pollingInterval);
    
    return () => clearInterval(interval);
  }, [fetchWebhookData, config.enabled, config.settings.webhook.pollingInterval]);

  // Calculate loading state
  const isLoadingAny = isLoading || 
    (config.enabled.includes(DataSource.FIREBASE) && firebaseLoading) ||
    (config.enabled.includes(DataSource.GOOGLE_SHEETS) && sheetsLoading);

  // Calculate error state
  const hasError = connectionStatus === 'error' ||
    (config.enabled.includes(DataSource.FIREBASE) && firebaseError) ||
    (config.enabled.includes(DataSource.GOOGLE_SHEETS) && sheetsError);

  return {
    // Combined data
    messages: getAllMessages(),
    
    // Individual source data (for debugging/monitoring)
    webhookMessages,
    firebaseMessages: getFirebaseMessages(),
    sheetsMessages: getSheetsMessages(),
    
    // Loading states
    isLoading: isLoadingAny,
    connectionStatus: hasError ? 'error' : connectionStatus,
    lastFetchTime,
    
    // Actions
    refreshAllSources,
    fetchWebhookData,
    
    // Configuration info
    enabledSources: config.enabled,
    primarySource: config.primary,
    secondarySource: config.secondary
  };
};

// USAGE EXAMPLES:
//
// Basic usage:
// const { messages, isLoading, refreshAllSources } = useDataSources();
//
// Access individual source data:
// const { webhookMessages, firebaseMessages, sheetsMessages } = useDataSources();
//
// Check which sources are enabled:
// const { enabledSources, primarySource } = useDataSources();