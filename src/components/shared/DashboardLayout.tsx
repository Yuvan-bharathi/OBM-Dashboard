import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  sidebar?: ReactNode;
}

const DashboardLayout = ({ children, title, subtitle, sidebar }: DashboardLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-dashboard-border px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Main
            </Button>
            <div className="h-6 w-px bg-dashboard-border" />
            <div>
              <h1 className="text-2xl font-bold text-primary">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="hidden sm:flex"
          >
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-64 bg-hsl(var(--sidebar-bg)) border-r border-dashboard-border flex-shrink-0">
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;