import { Badge } from '@/components/ui/badge';
import { Database, Globe, FileSpreadsheet, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DataSource } from '@/config/dataSources';

interface DataSourceStatusProps {
  source: DataSource;
  status: 'connected' | 'error' | 'loading';
  count: number;
  lastUpdate?: Date;
}

export const DataSourceStatus = ({ source, status, count, lastUpdate }: DataSourceStatusProps) => {
  const getIcon = () => {
    switch (source) {
      case DataSource.WEBHOOK:
        return <Globe className="h-3 w-3" />;
      case DataSource.FIREBASE:
        return <Database className="h-3 w-3" />;
      case DataSource.GOOGLE_SHEETS:
        return <FileSpreadsheet className="h-3 w-3" />;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'error':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'loading':
        return <Clock className="h-3 w-3 text-yellow-500 animate-pulse" />;
    }
  };

  const getStatusVariant = () => {
    switch (status) {
      case 'connected':
        return 'default';
      case 'error':
        return 'destructive';
      case 'loading':
        return 'secondary';
    }
  };

  return (
    <Badge variant={getStatusVariant()} className="text-xs flex items-center gap-1">
      {getIcon()}
      <span className="capitalize">{source.replace('_', ' ')}</span>
      <span>({count})</span>
      {getStatusIcon()}
    </Badge>
  );
};