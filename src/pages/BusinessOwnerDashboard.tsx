import DashboardLayout from '@/components/shared/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Package,
  BarChart3,
  PieChart
} from 'lucide-react';

const BusinessOwnerDashboard = () => {
  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231.89',
      change: '+20.1% from last month',
      icon: DollarSign,
      trend: 'up'
    },
    {
      title: 'Active Customers',
      value: '1,234',
      change: '+15% from last month',
      icon: Users,
      trend: 'up'
    },
    {
      title: 'Total Orders',
      value: '5,678',
      change: '+8% from last month',
      icon: Package,
      trend: 'up'
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      change: '+0.5% from last month',
      icon: TrendingUp,
      trend: 'up'
    }
  ];

  const topProducts = [
    { name: 'Comfort Hoodie', sales: 432, revenue: '$12,960' },
    { name: 'Sport Tee', sales: 387, revenue: '$9,675' },
    { name: 'Denim Jacket', sales: 234, revenue: '$18,720' },
    { name: 'Winter Coat', sales: 156, revenue: '$15,600' },
  ];

  const recentActivity = [
    { type: 'order', message: 'New order #1234 received', time: '2 minutes ago', status: 'success' },
    { type: 'customer', message: 'New customer registration', time: '15 minutes ago', status: 'info' },
    { type: 'inventory', message: 'Low stock alert: Comfort Hoodie', time: '1 hour ago', status: 'warning' },
    { type: 'payment', message: 'Payment processed: $89.00', time: '2 hours ago', status: 'success' },
  ];

  return (
    <DashboardLayout
      title="Business Owner Dashboard"
      subtitle="Monitor your business performance and key metrics"
    >
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                    {stat.change}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0">
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Top Performing Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sales} sales</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{product.revenue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="flex flex-row items-center space-y-0">
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-dashboard-accent rounded-lg">
                <div className="text-2xl font-bold text-primary">$12,450</div>
                <p className="text-sm text-muted-foreground">This Month Revenue</p>
                <Badge variant="default" className="mt-2">+18.5%</Badge>
              </div>
              <div className="text-center p-4 bg-dashboard-accent rounded-lg">
                <div className="text-2xl font-bold text-primary">847</div>
                <p className="text-sm text-muted-foreground">Orders Processed</p>
                <Badge variant="default" className="mt-2">+12.3%</Badge>
              </div>
              <div className="text-center p-4 bg-dashboard-accent rounded-lg">
                <div className="text-2xl font-bold text-primary">96.8%</div>
                <p className="text-sm text-muted-foreground">Customer Satisfaction</p>
                <Badge variant="default" className="mt-2">+2.1%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BusinessOwnerDashboard;