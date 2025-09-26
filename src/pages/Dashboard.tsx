import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Users, Settings, ShoppingCart } from 'lucide-react';

const Dashboard = () => {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const navigate = useNavigate();

  const handleEnterDashboard = () => {
    if (selectedRole) {
      navigate(`/${selectedRole.toLowerCase()}`);
    }
  };

  const roleOptions = [
    { value: 'operator', label: 'Operator', icon: ShoppingCart, description: 'Manage orders, inventory, and customer communications' },
    { value: 'business-owner', label: 'Business Owner', icon: Settings, description: 'View analytics and business insights' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-dashboard-accent via-background to-dashboard-muted">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 md:py-5 lg:py-7">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-3 md:mb-5">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
              Order Booking Manager
            </h1>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
              Select your role to access the appropriate dashboard and manage your operations efficiently
            </p>
          </div>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 lg:gap-7 mb-3 md:mb-5 max-w-4xl mx-auto">
            {roleOptions.map((role) => {
              const Icon = role.icon;
              return (
                <Card 
                  key={role.value}
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    selectedRole === role.value 
                      ? 'ring-2 ring-primary bg-dashboard-accent' 
                      : 'hover:bg-dashboard-accent/50'
                  }`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <CardHeader className="text-center pb-2 p-3 md:p-4 lg:p-5">
                    <div className="mx-auto mb-3 p-2 lg:p-3 bg-primary/10 rounded-full w-fit">
                      <Icon className="h-8 w-8 lg:h-10 lg:w-10 text-primary" />
                    </div>
                    <CardTitle className="text-xl md:text-2xl">{role.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center p-3 md:p-4 lg:p-5 pt-0">
                    <CardDescription className="text-base lg:text-lg">
                      {role.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Selection Interface */}
          <Card className="max-w-sm md:max-w-md lg:max-w-lg mx-auto bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="text-xl md:text-2xl">Dashboard Access</CardTitle>
              <CardDescription className="text-sm lg:text-base">
                Choose your role and enter the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm lg:text-base font-medium text-foreground">
                  Select Role
                </label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose your dashboard role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleEnterDashboard}
                disabled={!selectedRole}
                className="w-full text-base lg:text-lg py-3 bg-primary hover:bg-primary/90"
                size="lg"
              >
                Enter as {selectedRole ? roleOptions.find(r => r.value === selectedRole)?.label : 'Selected Role'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;