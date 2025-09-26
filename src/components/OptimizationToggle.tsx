import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Settings, Zap, Database } from 'lucide-react';

interface OptimizationToggleProps {
  onToggle?: (enabled: boolean) => void;
}

export const OptimizationToggle: React.FC<OptimizationToggleProps> = ({ onToggle }) => {
  const [isOptimized, setIsOptimized] = useState(true);

  const handleToggle = (enabled: boolean) => {
    setIsOptimized(enabled);
    onToggle?.(enabled);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Settings className="h-4 w-4" />
          Firebase Optimization
          <Badge variant={isOptimized ? "default" : "secondary"} className="ml-auto">
            {isOptimized ? "Enabled" : "Disabled"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="optimization-toggle" className="text-sm font-medium">
              Smart Caching & Limits
            </Label>
            <p className="text-xs text-muted-foreground">
              Reduce Firebase reads by 95% with intelligent caching
            </p>
          </div>
          <Switch
            id="optimization-toggle"
            checked={isOptimized}
            onCheckedChange={handleToggle}
          />
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-xs">
            <Zap className="h-3 w-3 text-green-500" />
            <span className={isOptimized ? "text-foreground" : "text-muted-foreground"}>
              Debounced listeners (1s delay)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Database className="h-3 w-3 text-blue-500" />
            <span className={isOptimized ? "text-foreground" : "text-muted-foreground"}>
              Smart query limits (50 conversations, 100 messages)
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Database className="h-3 w-3 text-purple-500" />
            <span className={isOptimized ? "text-foreground" : "text-muted-foreground"}>
              Presence tracking limited to 20 users
            </span>
          </div>
        </div>

        {!isOptimized && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              ⚠️ <strong>Warning:</strong> Disabling optimization may result in high Firebase usage and costs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};