import { useState, useEffect } from 'react';

// Browser-Compatible Google Sheets Integration Hook
// This hook uses the Google Sheets REST API directly (browser-compatible)

export interface GoogleSheetsMessage {
  phone_number: string;
  name: string;
  Product: string;
  Category: string;
  Intent: string;
  Message: string;
  product?: string;
  category?: string;
  intent?: string;
  message?: string;
  timestamp?: string;
  id?: string;
}

interface UseGoogleSheetsProps {
  spreadsheetId: string;
  sheetName: string;
  range: string;
  apiKey?: string;
  enabled: boolean;
}

export const useGoogleSheets = ({
  spreadsheetId,
  sheetName,
  range,
  apiKey,
  enabled
}: UseGoogleSheetsProps) => {
  const [data, setData] = useState<GoogleSheetsMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Construct Google Sheets API URL
  const buildSheetsUrl = (action: 'get' | 'append' = 'get') => {
    const baseUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
    if (action === 'get') {
      return `${baseUrl}/values/${sheetName}!${range}?key=${apiKey}`;
    } else {
      return `${baseUrl}/values/${sheetName}!${range}:append?valueInputOption=RAW&key=${apiKey}`;
    }
  };

  // Fetch data from Google Sheets using REST API
  const fetchSheetsData = async () => {
    if (!enabled || !spreadsheetId || !apiKey) return;

    setLoading(true);
    setError(null);

    try {
      const url = buildSheetsUrl('get');
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const rows = result.values || [];
      
      // Skip header row and convert to message format
      const messages: GoogleSheetsMessage[] = rows.slice(1).map((row, index) => ({
        id: `sheets-${Date.now()}-${index}`,
        phone_number: row[0] || '',
        name: row[1] || '',
        Product: row[2] || '',
        Category: row[3] || '',
        Intent: row[4] || '',
        Message: row[5] || '',
        timestamp: row[6] || new Date().toISOString()
      }));

      setData(messages);
      console.log('Google Sheets data fetched:', messages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Google Sheets data';
      setError(errorMessage);
      console.error('Google Sheets fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new message to Google Sheets using REST API
  const addMessage = async (message: Omit<GoogleSheetsMessage, 'id' | 'timestamp'>) => {
    if (!enabled || !spreadsheetId || !apiKey) return;

    try {
      const timestamp = new Date().toISOString();
      const row = [
        message.phone_number,
        message.name,
        message.Product,
        message.Category,
        message.Intent,
        message.Message,
        timestamp
      ];

      const url = buildSheetsUrl('append');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add message: ${response.status} ${response.statusText}`);
      }

      // Refresh data after adding
      await fetchSheetsData();
      
      console.log('Message added to Google Sheets');
    } catch (err) {
      console.error('Failed to add message to Google Sheets:', err);
      throw err;
    }
  };

  // 🚨 EMERGENCY: Disabled automatic polling to reduce API requests
  useEffect(() => {
    if (!enabled) return;

    // Single fetch on mount only, NO automatic polling
    fetchSheetsData();

    // 🚨 NO INTERVAL - Manual refresh only to stop excessive requests
  }, [enabled, spreadsheetId, sheetName, range, apiKey]);

  return {
    data,
    loading,
    error,
    refetch: fetchSheetsData,
    addMessage
  };
};

// SETUP INSTRUCTIONS FOR GOOGLE SHEETS (Browser-Compatible):
// 
// 1. Create a Google Cloud Project:
//    - Go to https://console.cloud.google.com/
//    - Create a new project or select an existing one
//
// 2. Enable Google Sheets API:
//    - Go to APIs & Services > Library
//    - Search for "Google Sheets API" and enable it
//
// 3. Create API Key (for public data):
//    - Go to APIs & Services > Credentials
//    - Click "Create Credentials" > "API Key"
//    - Copy the API key and add it to your configuration
//    - IMPORTANT: Restrict the API key to Google Sheets API only for security
//
// 4. Prepare your Google Sheet:
//    - Create a new Google Sheet or use an existing one
//    - Make sure the first row contains headers: 
//      phone_number | name | Product | Category | Intent | Message | timestamp
//    - Make the sheet publicly readable:
//      - Click "Share" button
//      - Change to "Anyone with the link can view"
//      - OR set up service account authentication for private sheets
//
// 5. Get Spreadsheet ID:
//    - The spreadsheet ID is in the URL: 
//      https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
//
// 6. Update Configuration:
//    - Add your spreadsheet ID and API key to the data source configuration
//    - Set the correct sheet name and range
//
// 7. For Private Sheets (Advanced):
//    - Create a Service Account instead of API key
//    - Download the JSON credentials file
//    - Share the sheet with the service account email
//    - Use OAuth flow for authentication (requires additional setup)