import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, BarChart3, MessageSquare, LogOut, User } from "lucide-react";

const Index = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const availableRoutes = [
    {
      id: 'chat',
      title: 'Chat Dashboard',
      description: 'Manage customer conversations and messages',
      icon: MessageSquare,
      path: '/chat',
      allowedRoles: ['operator', 'business_owner'],
    },
    {
      id: 'operator',
      title: 'Operator Dashboard',
      description: 'Handle orders and customer inquiries',
      icon: Users,
      path: '/operator',
      allowedRoles: ['operator', 'business_owner'],
    },
    {
      id: 'business-owner',
      title: 'Business Owner Dashboard',
      description: 'Analytics, reports, and business insights',
      icon: BarChart3,
      path: '/business-owner',
      allowedRoles: ['business_owner'],
    },
  ].filter(route => 
    userProfile && route.allowedRoles.includes(userProfile.role)
  );

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-accent via-background to-dashboard-muted">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Welcome, {userProfile.displayName}
              </h2>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {userProfile.role === 'business_owner' ? 'Business Owner' : 'Operator'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {userProfile.email}
                </span>
              </div>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Dashboard Hub
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Access your available dashboards and manage your order booking system efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableRoutes.map((route) => (
              <Card 
                key={route.id}
                className="cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg hover:ring-1 hover:ring-primary/50"
                onClick={() => navigate(route.path)}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit">
                    <route.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{route.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {route.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full">
                    Access Dashboard
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
