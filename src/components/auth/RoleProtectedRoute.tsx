import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/user';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackRoute?: string;
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  children, 
  allowedRoles, 
  fallbackRoute = '/' 
}) => {
  const { userProfile, loading } = useAuth();
  const navigate = useNavigate();

  // Still loading user profile
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // User doesn't have required role
  if (!userProfile || !allowedRoles.includes(userProfile.role)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dashboard-accent via-background to-dashboard-muted flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Alert variant="destructive" className="text-center">
            <ShieldX className="h-4 w-4 mx-auto mb-2" />
            <AlertDescription className="space-y-4">
              <div>
                <p className="font-medium">Access Denied</p>
                <p className="text-sm mt-1">
                  You don't have permission to access this page.
                </p>
                {userProfile && (
                  <p className="text-xs mt-2 text-muted-foreground">
                    Current role: {userProfile.role}
                  </p>
                )}
              </div>
              <Button 
                onClick={() => navigate(fallbackRoute)}
                variant="outline"
                size="sm"
              >
                Go Back
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};