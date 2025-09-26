// Data Source Configuration System
// This file manages which data sources are enabled and how they're combined

export enum DataSource {
  WEBHOOK = 'webhook',
  FIREBASE = 'firebase',
  GOOGLE_SHEETS = 'google_sheets'
}

export interface DataSourceConfig {
  primary: DataSource;
  secondary?: DataSource;
  enabled: DataSource[];
  settings: {
    webhook: {
      url: string;
      pollingInterval: number;
      retryAttempts: number;
    };
    firebase: {
      collectionName: string;
      realTimeUpdates: boolean;
    };
    googleSheets: {
      spreadsheetId: string;
      sheetName: string;
      range: string;
      apiKey?: string;
    };
  };
}

// DEFAULT CONFIGURATION
// Change these settings based on your use case
export const defaultDataSourceConfig: DataSourceConfig = {
  // CURRENT USE CASE: Firebase only for dashboard data
  primary: DataSource.FIREBASE,
  secondary: undefined,
  enabled: [DataSource.FIREBASE],
  
  settings: {
    webhook: {
      url: 'https://stsdev.app.n8n.cloud/webhook/5a40d976-4ddb-4ff5-8d35-71ac4cd01f37',
      pollingInterval: 15000, // 15 seconds
      retryAttempts: 3
    },
    firebase: {
      collectionName: 'messages',
      realTimeUpdates: true
    },
    googleSheets: {
      spreadsheetId: '', // Add your Google Sheets ID here
      sheetName: 'Customer Details',
      range: 'A:H', // Adjust range based on your sheet structure
      apiKey: 'AIzaSyATuE97hvIRVQ9QH_ycqyYdGRG3-AI0HE4' // Add your Google Sheets API key here
    }
  }
};

// CONFIGURATION EXAMPLES FOR DIFFERENT USE CASES:

// Use Case 1: Webhook Only
/*
export const webhookOnlyConfig: DataSourceConfig = {
  primary: DataSource.WEBHOOK,
  enabled: [DataSource.WEBHOOK],
  settings: {
    // ... webhook settings only
  }
};
*/

// Use Case 2: Firebase Only
/*
export const firebaseOnlyConfig: DataSourceConfig = {
  primary: DataSource.FIREBASE,
  enabled: [DataSource.FIREBASE],
  settings: {
    // ... firebase settings only
  }
};
*/

// Use Case 3: Google Sheets Only
/*
export const googleSheetsOnlyConfig: DataSourceConfig = {
  primary: DataSource.GOOGLE_SHEETS,
  enabled: [DataSource.GOOGLE_SHEETS],
  settings: {
    // ... google sheets settings only
  }
};
*/

// Use Case 4: All Three Sources Combined
/*
export const allSourcesConfig: DataSourceConfig = {
  primary: DataSource.FIREBASE,
  secondary: DataSource.WEBHOOK,
  enabled: [DataSource.WEBHOOK, DataSource.FIREBASE, DataSource.GOOGLE_SHEETS],
  settings: {
    // ... all settings
  }
};
*/

// HOW TO SWITCH BETWEEN CONFIGURATIONS:
// 1. Replace 'defaultDataSourceConfig' with your desired config
// 2. Update the settings values (URLs, IDs, API keys, etc.)
// 3. The dashboard will automatically use the new configuration