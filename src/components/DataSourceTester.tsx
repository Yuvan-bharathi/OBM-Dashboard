import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useOptimizedDataSources } from '@/hooks/useOptimizedDataSources';
import { DataSource } from '@/config/dataSources';
import { Database, Globe, FileSpreadsheet, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { FirebaseQuotaMonitor } from './FirebaseQuotaMonitor';

// Data Sources Testing Component
// Use this component to test and monitor all data source integrations

export const DataSourceTester = () => {
  const {
    messages,
    webhookMessages,
    firebaseMessages,
    sheetsMessages,
    isLoading,
    connectionStatus,
    lastFetchTime,
    refreshAllSources,
    enabledSources,
    primarySource,
    secondarySource,
    isRateLimited,
    usageStats
  } = useOptimizedDataSources();

  const getSourceIcon = (source: DataSource) => {
    switch (source) {
      case DataSource.WEBHOOK:
        return <Globe className="h-4 w-4" />;
      case DataSource.FIREBASE:
        return <Database className="h-4 w-4" />;
      case DataSource.GOOGLE_SHEETS:
        return <FileSpreadsheet className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Data Sources Monitor (Optimized)
          {getStatusIcon(connectionStatus)}
          {isRateLimited && (
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Rate Limited
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Configuration Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Configuration</h3>
            <div className="space-y-1">
              <Badge variant="default" className="flex items-center gap-1 w-fit">
                {getSourceIcon(primarySource)}
                Primary: {primarySource}
              </Badge>
              {secondarySource && (
                <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                  {getSourceIcon(secondarySource)}
                  Secondary: {secondarySource}
                </Badge>
              )}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Status</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {getStatusIcon(connectionStatus)}
                <span className="text-sm">{connectionStatus}</span>
              </div>
              {lastFetchTime && (
                <div className="text-xs text-muted-foreground">
                  Last update: {lastFetchTime.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Individual Source Status */}
        <div>
          <h3 className="font-semibold mb-3">Source Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Webhook */}
            {enabledSources.includes(DataSource.WEBHOOK) && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Webhook</span>
                  <Badge variant="outline" className="text-xs">
                    {webhookMessages.length} messages
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Real-time polling active
                </div>
              </Card>
            )}

            {/* Firebase */}
            {enabledSources.includes(DataSource.FIREBASE) && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Firebase</span>
                  <Badge variant="outline" className="text-xs">
                    {firebaseMessages.length} messages
                  </Badge>
                </div>
                 <div className="text-xs text-muted-foreground">
                   {isRateLimited ? 'Rate limited - disabled' : 'Real-time listeners active'}
                 </div>
              </Card>
            )}

            {/* Google Sheets */}
            {enabledSources.includes(DataSource.GOOGLE_SHEETS) && (
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="font-medium">Google Sheets</span>
                  <Badge variant="outline" className="text-xs">
                    {sheetsMessages.length} messages
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Polling every 30s
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Combined Data Summary */}
        <div>
          <h3 className="font-semibold mb-3">Combined Data</h3>
          <div className="flex items-center gap-4">
            <Badge variant="default" className="text-sm">
              Total Messages: {messages.length}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshAllSources}
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh All Sources'}
            </Button>
          </div>
        </div>

        {/* Firebase Quota Monitoring */}
        {usageStats && (
          <FirebaseQuotaMonitor 
            usageStats={usageStats}
            dailyReadLimit={1000}
            dailyWriteLimit={1000}
          />
        )}

        {/* Recent Messages */}
        {messages.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Recent Messages (Last 5)</h3>
            <div className="space-y-2">
              {messages.slice(0, 5).map((message) => (
                <div key={message.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  {getSourceIcon(message.source)}
                  <span className="font-medium">{message.name}:</span>
                  <span className="text-sm truncate">{message.message}</span>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {message.category}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};