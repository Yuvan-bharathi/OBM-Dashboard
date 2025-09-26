import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Database, AlertTriangle, CheckCircle } from 'lucide-react';

interface FirebaseUsageStats {
  reads: number;
  writes: number;
  lastReset: number;
}

interface FirebaseQuotaMonitorProps {
  usageStats: FirebaseUsageStats;
  dailyReadLimit?: number;
  dailyWriteLimit?: number;
}

export const FirebaseQuotaMonitor = ({ 
  usageStats, 
  dailyReadLimit = 1000,
  dailyWriteLimit = 1000 
}: FirebaseQuotaMonitorProps) => {
  const readPercentage = Math.min((usageStats.reads / dailyReadLimit) * 100, 100);
  const writePercentage = Math.min((usageStats.writes / dailyWriteLimit) * 100, 100);
  
  const isHighUsage = readPercentage > 80 || writePercentage > 80;
  const isCriticalUsage = readPercentage > 95 || writePercentage > 95;
  
  const getUsageStatus = () => {
    if (isCriticalUsage) return { color: 'destructive', icon: AlertTriangle, text: 'Critical' };
    if (isHighUsage) return { color: 'secondary', icon: AlertTriangle, text: 'High Usage' };
    return { color: 'default', icon: CheckCircle, text: 'Normal' };
  };

  const status = getUsageStatus();
  const StatusIcon = status.icon;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Firebase Quota Monitor
          <Badge variant={status.color as any} className="text-xs">
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Daily Reads</span>
            <span>{usageStats.reads} / {dailyReadLimit}</span>
          </div>
          <Progress value={readPercentage} className="h-2" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span>Daily Writes</span>
            <span>{usageStats.writes} / {dailyWriteLimit}</span>
          </div>
          <Progress value={writePercentage} className="h-2" />
        </div>

        {isHighUsage && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {isCriticalUsage 
                ? "Critical usage! Approaching daily Firebase limits. Manual refresh only."
                : "High Firebase usage detected. Consider reducing query frequency."
              }
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          Reset: {new Date(usageStats.lastReset).toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};