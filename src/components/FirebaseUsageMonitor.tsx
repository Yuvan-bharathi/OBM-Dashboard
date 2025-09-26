import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Database, TrendingUp, Clock } from 'lucide-react';

interface FirebaseUsageMonitorProps {
  usageStats: {
    reads: number;
    writes: number;
    lastReset: number;
  };
  maxReadsPerDay?: number;
  maxWritesPerDay?: number;
}

export const FirebaseUsageMonitor: React.FC<FirebaseUsageMonitorProps> = ({
  usageStats,
  maxReadsPerDay = 5000,
  maxWritesPerDay = 2500,
}) => {
  const { reads, writes, lastReset } = usageStats;
  
  const readsPercentage = (reads / maxReadsPerDay) * 100;
  const writesPercentage = (writes / maxWritesPerDay) * 100;
  
  const hoursElapsed = (Date.now() - lastReset) / (1000 * 60 * 60);
  const estimatedDailyReads = hoursElapsed > 0 ? (reads / hoursElapsed) * 24 : 0;
  const estimatedDailyWrites = hoursElapsed > 0 ? (writes / hoursElapsed) * 24 : 0;
  
  const isReadsAtRisk = readsPercentage > 80;
  const isWritesAtRisk = writesPercentage > 80;
  
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };
  
  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    }
    return `${minutes}m ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Database className="h-4 w-4" />
          Firebase Usage Monitor
          {(isReadsAtRisk || isWritesAtRisk) && (
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              High Usage
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reads Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Database Reads</span>
            <span className={`font-mono ${isReadsAtRisk ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatNumber(reads)} / {formatNumber(maxReadsPerDay)}
            </span>
          </div>
          <Progress 
            value={Math.min(readsPercentage, 100)} 
            className={`h-2 ${isReadsAtRisk ? '[&>div]:bg-destructive' : ''}`}
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Est. daily: {formatNumber(estimatedDailyReads)}</span>
          </div>
        </div>

        {/* Writes Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Database Writes</span>
            <span className={`font-mono ${isWritesAtRisk ? 'text-destructive' : 'text-muted-foreground'}`}>
              {formatNumber(writes)} / {formatNumber(maxWritesPerDay)}
            </span>
          </div>
          <Progress 
            value={Math.min(writesPercentage, 100)} 
            className={`h-2 ${isWritesAtRisk ? '[&>div]:bg-destructive' : ''}`}
          />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Est. daily: {formatNumber(estimatedDailyWrites)}</span>
          </div>
        </div>

        {/* Reset Timer */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Last reset: {formatDuration(Date.now() - lastReset)}</span>
          </div>
        </div>

        {/* Optimization Tips */}
        {(isReadsAtRisk || isWritesAtRisk) && (
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> High usage detected. Consider reducing real-time listeners or adding more caching.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};