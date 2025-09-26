import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/shared/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ShoppingCart, 
  Package, 
  MessageSquare, 
  History,
  Search,
  Plus,
  Minus,
  Send,
  RefreshCw,
  Loader2,
  Users,
  Database,
  Globe,
  FileSpreadsheet
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { ChatPanel } from "@/components/ChatPanel";
import { DataSourceTester } from "@/components/DataSourceTester";
import { useOptimizedDataSources } from '@/hooks/useOptimizedDataSources';
import { defaultDataSourceConfig, DataSource } from '@/config/dataSources';

const OperatorDashboard = () => {
  const [activeTab, setActiveTab] = useState('new-orders');
  const [activeMessageCategory, setActiveMessageCategory] = useState('follow-ups');
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{phone: string, name: string} | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Ultra-optimized data integration with minimal Firebase reads
  const {
    messages: allSourceMessages,
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

  // Sample messages data (keeping as fallback)
  const sampleMessages = [
    { id: 1, category: 'follow-ups', message: 'Any update on my order #1002?', customer: 'Liam', date: '8/7/2025', time: '04:50 PM', phone: '+1234567890', product: 'Sport Tee', intent: 'Follow Up' },
    { id: 2, category: 'follow-ups', message: 'Following up on exchange request.', customer: 'Emma', date: '8/6/2025', time: '12:00 AM', phone: '+1234567891', product: 'Denim Jacket', intent: 'Follow Up' },
    { id: 3, category: 'enquiries', message: 'Can you confirm my size is in stock?', customer: 'Ava', date: '8/7/2025', time: '03:45 PM', phone: '+1234567892', product: 'Comfort Hoodie', intent: 'Enquiry' },
    { id: 4, category: 'enquiries', message: 'Do you ship internationally?', customer: 'Ethan', date: '8/4/2025', time: '07:40 PM', phone: '+1234567893', product: 'Sport Tee', intent: 'Enquiry' },
    { id: 5, category: 'complaints', message: 'The jacket color is wrong.', customer: 'Mia', date: '8/5/2025', time: '10:15 PM', phone: '+1234567894', product: 'Denim Jacket', intent: 'Complaint' },
    { id: 6, category: 'returns', message: "I'd like to return my order #1003", customer: 'Noah', date: '8/6/2025', time: '02:30 PM', phone: '+1234567895', product: 'Comfort Hoodie', intent: 'Return Request' },
  ];

  // Data source status indicators
  const getSourceIcon = (source: DataSource) => {
    switch (source) {
      case DataSource.WEBHOOK:
        return <Globe className="h-4 w-4" />;
      case DataSource.FIREBASE:
        return <Database className="h-4 w-4" />;
      case DataSource.GOOGLE_SHEETS:
        return <FileSpreadsheet className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getSourceLabel = (source: DataSource) => {
    switch (source) {
      case DataSource.WEBHOOK:
        return 'Webhook';
      case DataSource.FIREBASE:
        return 'Firebase';
      case DataSource.GOOGLE_SHEETS:
        return 'Google Sheets';
      default:
        return source;
    }
  };

  // Test function with sample data for all sources
  const testWithSampleData = () => {
    console.log('Testing with sample data for enabled sources:', enabledSources);
    console.log('Current messages count:', allSourceMessages.length);
    console.log('Webhook messages:', webhookMessages.length);
    console.log('Firebase messages:', firebaseMessages.length);
    console.log('Sheets messages:', sheetsMessages.length);
  };

  // Open chat for a specific customer
  const openChatForCustomer = (customerPhone: string, customerName: string) => {
    setSelectedCustomer({ phone: customerPhone, name: customerName });
    
    // Normalize phone numbers for comparison (remove spaces, dashes, etc.)
    const normalizePhone = (phone: string) => phone.replace(/[\s\-\(\)]/g, '');
    const normalizedCustomerPhone = normalizePhone(customerPhone);
    
    // Filter messages for this customer from all sources and convert to chat format
    const customerChatMessages = allSourceMessages
      .filter(msg => {
        const normalizedMsgPhone = normalizePhone(String(msg.phone_number || ''));
        return normalizedMsgPhone === normalizedCustomerPhone;
      })
      .map(msg => ({
        id: msg.id,
        message: msg.message,
        sender: msg.sender || 'customer', // Use the sender from unified message
        timestamp: msg.timestamp,
        phone_number: msg.phone_number,
        name: msg.name || customerName,
        source: msg.source, // Include source info
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()); // Sort ascending (oldest first)
    
    setChatMessages(customerChatMessages);
    setIsChatOpen(true);
  };

  const closeChatPanel = () => {
    setIsChatOpen(false);
    setSelectedCustomer(null);
    setChatMessages([]);
  };

  // No longer needed - polling is handled by useDataSources hook

  // Map Firebase/webhook category to dashboard category (case-insensitive)
  const mapWebhookCategory = (category: string): string => {
    const normalizedCategory = (category || '').toLowerCase().trim();
    console.log('🏷️ Mapping category:', category, '→', normalizedCategory);
    
    switch (normalizedCategory) {
      case 'new order':
      case 'neworder':
      case 'purchase request':
      case 'purchaserequest':
      case 'order':
        return 'new-orders';
      case 'enquiry':
      case 'inquiry':
      case 'question':
      case 'general':
        return 'enquiries';
      case 'follow up':
      case 'followup':
      case 'follow-up':
        return 'follow-ups';
      case 'complaint':
      case 'complaints':
      case 'issue':
        return 'complaints';
      case 'return':
      case 'returns':
      case 'return request':
      case 'refund':
        return 'returns';
      default:
        console.log('🏷️ Unknown category, defaulting to enquiries:', category);
        return 'enquiries';
    }
  };

  // Convert unified messages to dashboard format with null handling
  const convertToDisplayMessage = (msg: any) => {
    const timestamp = new Date(msg.timestamp || Date.now());
    return {
      id: msg.id || `msg-${Date.now()}`,
      category: mapWebhookCategory(msg.category),
      message: msg.message || 'No message content',
      customer: msg.name || 'Unknown Customer',
      phone: msg.phone_number || 'N/A',
      product: msg.product || 'No product specified',
      intent: msg.intent || 'General',
      date: timestamp.toLocaleDateString(),
      time: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: msg.source || 'unknown',
    };
  };

  // Get all messages from Firebase-only sources (no sample data mixing)
  const allMessages = allSourceMessages.map(convertToDisplayMessage);

  // Get new orders from Firebase sources with improved filtering
  const newOrders = allSourceMessages
    .filter(msg => {
      const category = (msg.category || '').toLowerCase();
      return category === 'new order' || 
             category === 'purchase request' || 
             category === 'order' ||
             category === 'neworder' ||
             category === 'purchaserequest';
    })
    .map((msg, index) => ({
      id: `#${1007 + index}`, // Generate order ID
      customer: msg.name || 'Unknown Customer',
      phone: msg.phone_number || 'N/A',
      product: msg.product || 'No product specified',
      intent: msg.intent || 'General',
      message: msg.message || 'No message content',
      total: '$99.00', // Default total - can be dynamic
      source: msg.source,
    }));

  const getMessagesCount = (category: string) => {
    return allMessages.filter(msg => msg.category === category).length;
  };

  const filteredMessages = allMessages.filter(msg => msg.category === activeMessageCategory);

  const sidebar = (
    <div className="p-6">
      <div className="space-y-2">
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            QUICK LINKS
          </h2>
        </div>
        
        <Button
          variant={activeTab === 'new-orders' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveTab('new-orders')}
        >
          <ShoppingCart className="h-4 w-4 mr-3" />
          New Orders
        </Button>
        
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveTab('inventory')}
        >
          <Package className="h-4 w-4 mr-3" />
          Inventory
        </Button>
        
        <Button
          variant={activeTab === 'messages' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveTab('messages')}
        >
          <MessageSquare className="h-4 w-4 mr-3" />
          Messages
        </Button>
        
        <Button
          variant={activeTab === 'follow-ups' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveTab('follow-ups')}
        >
          <Users className="h-4 w-4 mr-3" />
          Follow Ups
        </Button>
        
        <Button
          variant={activeTab === 'data-sources' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveTab('data-sources')}
        >
          <Database className="h-4 w-4 mr-3" />
          Data Sources
        </Button>
        
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setActiveTab('history')}
        >
          <History className="h-4 w-4 mr-3" />
          History
        </Button>
      </div>
    </div>
  );

  const renderNewOrders = () => (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Incoming Orders</h2>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-muted-foreground">Data Sources:</span>
              {enabledSources.map((source, index) => (
                <Badge key={source} variant="outline" className="text-xs">
                  {getSourceIcon(source)}
                  <span className="ml-1">{getSourceLabel(source)}</span>
                  {source === primarySource && <span className="ml-1">(Primary)</span>}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Input 
              id="order-filter"
              name="order-filter"
              placeholder="Filter by ID or name" 
              className="w-64"
              aria-label="Filter orders by ID or name"
            />
            <Button variant="outline" size="icon">
              <Search className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshAllSources}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={testWithSampleData}
            >
              Test Data
            </Button>
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="text-xs text-muted-foreground">
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'error' ? 'Error' : 'Connecting...'}
              </span>
              {isRateLimited && (
                <Badge variant="destructive" className="text-xs">Rate Limited</Badge>
              )}
              {usageStats && (
                <span className="text-xs text-muted-foreground">
                  FB Reads: {usageStats.reads}/1000
                </span>
              )}
              {lastFetchTime && (
                <span className="text-xs text-muted-foreground">
                  Updated: {lastFetchTime.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
        </div>

      <Card className="shadow-sm border-0 bg-gradient-to-r from-card to-card/95">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="font-bold text-foreground">Order #</TableHead>
                <TableHead className="font-bold text-foreground">Customer</TableHead>
                <TableHead className="font-bold text-foreground">Phone</TableHead>
                <TableHead className="font-bold text-foreground">Product</TableHead>
                <TableHead className="font-bold text-foreground">Intent</TableHead>
                <TableHead className="font-bold text-foreground">Total</TableHead>
                <TableHead className="font-bold text-foreground">Source</TableHead>
                <TableHead className="font-bold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Static sample orders */}
              <TableRow className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-semibold">#1001</TableCell>
                <TableCell>Ava</TableCell>
                <TableCell>+1234567890</TableCell>
                <TableCell>Comfort Hoodie</TableCell>
                <TableCell>Purchase Request</TableCell>
                <TableCell className="font-medium">$89.00</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">Sample</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary" className="hover:bg-secondary/80">Process</Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Reject</Button>
                    <Button size="sm" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md">Send WhatsApp</Button>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-accent/30 transition-colors bg-accent/5">
                <TableCell className="font-semibold">#1002</TableCell>
                <TableCell>Liam</TableCell>
                <TableCell>+1234567891</TableCell>
                <TableCell>Sport Tee</TableCell>
                <TableCell>Purchase Request</TableCell>
                <TableCell className="font-medium">$129.00</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">Sample</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="secondary" className="hover:bg-secondary/80">Process</Button>
                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Reject</Button>
                    <Button size="sm" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md">Send WhatsApp</Button>
                  </div>
                </TableCell>
              </TableRow>
              
              {/* Dynamic orders from all sources */}
              {newOrders.map((order, index) => (
                <TableRow 
                  key={order.id}
                  className={`hover:bg-muted/30 transition-colors ${index % 2 === 0 ? 'bg-accent/5' : ''}`}
                >
                  <TableCell className="font-semibold">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.phone}</TableCell>
                  <TableCell>{order.product}</TableCell>
                  <TableCell>{order.intent}</TableCell>
                  <TableCell className="font-medium">{order.total}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {getSourceIcon(order.source)}
                      <span className="ml-1">{getSourceLabel(order.source)}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary" className="hover:bg-secondary/80">Process</Button>
                      <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">Reject</Button>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-md"
                        onClick={() => openChatForCustomer(order.phone, order.customer)}
                      >
                        Chat
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventory</h2>
      
      <Card className="shadow-sm border-0 bg-gradient-to-r from-card to-card/95">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="font-bold text-foreground">SKU</TableHead>
                <TableHead className="font-bold text-foreground">Product</TableHead>
                <TableHead className="font-bold text-foreground">Stock</TableHead>
                <TableHead className="font-bold text-foreground">Adjust</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-semibold">HD-100</TableCell>
                <TableCell>Comfort Hoodie</TableCell>
                <TableCell className="font-medium">24</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="hover:bg-destructive/10 hover:text-destructive">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">-1</span>
                    <Button size="sm" variant="outline" className="hover:bg-primary/10 hover:text-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">+1</span>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-accent/30 transition-colors bg-accent/5">
                <TableCell className="font-semibold">TS-220</TableCell>
                <TableCell>Sport Tee</TableCell>
                <TableCell className="font-medium">52</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="hover:bg-destructive/10 hover:text-destructive">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">-1</span>
                    <Button size="sm" variant="outline" className="hover:bg-primary/10 hover:text-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">+1</span>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-semibold">JK-330</TableCell>
                <TableCell>Denim Jacket</TableCell>
                <TableCell className="font-medium">8</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Button size="sm" variant="outline" className="hover:bg-destructive/10 hover:text-destructive">
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">-1</span>
                    <Button size="sm" variant="outline" className="hover:bg-primary/10 hover:text-primary">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium text-muted-foreground">+1</span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderMessages = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Messages</h2>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={testWithSampleData}
            className="bg-blue-50 hover:bg-blue-100"
          >
            Test Data Sources
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={refreshAllSources}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
          <div className="flex items-center space-x-1">
            <div className={`h-2 w-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
            }`} />
            <span className="text-xs text-muted-foreground">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'error' ? 'CORS Error' : 'Connecting...'}
            </span>
          </div>
          {lastFetchTime && (
            <span className="text-xs text-muted-foreground">
              Last: {lastFetchTime.toLocaleTimeString()}
            </span>
          )}
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              All: {allSourceMessages.length}
            </Badge>
            {enabledSources.map(source => (
              <Badge key={source} variant="outline" className="text-xs">
                {getSourceIcon(source)}
                <span className="ml-1">
                  {source === DataSource.WEBHOOK && webhookMessages.length}
                  {source === DataSource.FIREBASE && firebaseMessages.length}
                  {source === DataSource.GOOGLE_SHEETS && sheetsMessages.length}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </div>
      
      {/* Category Buttons */}
      <div className="flex flex-wrap gap-3">
        {[
          { key: 'enquiries', label: 'Enquiries' },
          { key: 'complaints', label: 'Complaints' },
          { key: 'returns', label: 'Returns' }
        ].map((category) => (
          <Button
            key={category.key}
            variant={activeMessageCategory === category.key ? 'default' : 'outline'}
            onClick={() => setActiveMessageCategory(category.key)}
            className="relative"
          >
            {category.label}
            <Badge 
              variant="secondary" 
              className="ml-2 text-xs bg-primary text-primary-foreground"
            >
              {getMessagesCount(category.key)}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Messages Table */}
      <Card className="shadow-sm border-0 bg-gradient-to-r from-card to-card/95">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="font-bold text-foreground">Message</TableHead>
                <TableHead className="font-bold text-foreground">Customer</TableHead>
                <TableHead className="font-bold text-foreground">Phone</TableHead>
                <TableHead className="font-bold text-foreground">Product</TableHead>
                <TableHead className="font-bold text-foreground">Intent</TableHead>
                <TableHead className="font-bold text-foreground">Date</TableHead>
                <TableHead className="font-bold text-foreground">Time</TableHead>
                <TableHead className="font-bold text-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.map((message, index) => (
                <TableRow 
                  key={message.id}
                  className={`hover:bg-muted/30 transition-colors ${index % 2 === 1 ? 'bg-accent/5' : ''}`}
                >
                  <TableCell className="font-medium max-w-md">
                    {message.message}
                  </TableCell>
                  <TableCell>{message.customer}</TableCell>
                  <TableCell>{message.phone || 'N/A'}</TableCell>
                  <TableCell>{message.product || 'N/A'}</TableCell>
                  <TableCell>{message.intent || 'N/A'}</TableCell>
                  <TableCell>{message.date}</TableCell>
                  <TableCell>{message.time}</TableCell>
                  <TableCell>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs"
                      onClick={() => openChatForCustomer(message.phone || '', message.customer)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Order History</h2>
      
      <Card className="shadow-sm border-0 bg-gradient-to-r from-card to-card/95">
        <CardContent className="p-6">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="font-bold text-foreground">Order #</TableHead>
                <TableHead className="font-bold text-foreground">Customer</TableHead>
                <TableHead className="font-bold text-foreground">Status</TableHead>
                <TableHead className="font-bold text-foreground">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-semibold">#1003</TableCell>
                <TableCell>Noah</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Processing</Badge>
                </TableCell>
                <TableCell className="font-medium">$54.00</TableCell>
              </TableRow>
              <TableRow className="hover:bg-accent/30 transition-colors bg-accent/5">
                <TableCell className="font-semibold">#1004</TableCell>
                <TableCell>Mia</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Delivered</Badge>
                </TableCell>
                <TableCell className="font-medium">$349.00</TableCell>
              </TableRow>
              <TableRow className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-semibold">#1005</TableCell>
                <TableCell>Ethan</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">Returned</Badge>
                </TableCell>
                <TableCell className="font-medium">$72.00</TableCell>
              </TableRow>
              <TableRow className="hover:bg-accent/30 transition-colors bg-accent/5">
                <TableCell className="font-semibold">#1006</TableCell>
                <TableCell>Emma</TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Exchanged</Badge>
                </TableCell>
                <TableCell className="font-medium">$92.00</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderFollowUps = () => {
    const followUpMessages = allMessages.filter(msg => msg.category === 'follow-ups');
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Follow Ups</h2>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Total: {followUpMessages.length}
            </Badge>
          </div>
        </div>
        
        <Card className="shadow-sm border-0 bg-gradient-to-r from-card to-card/95">
          <CardContent className="p-6">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b-2">
                  <TableHead className="font-bold text-foreground">Message</TableHead>
                  <TableHead className="font-bold text-foreground">Customer</TableHead>
                  <TableHead className="font-bold text-foreground">Phone</TableHead>
                  <TableHead className="font-bold text-foreground">Product</TableHead>
                  <TableHead className="font-bold text-foreground">Date</TableHead>
                  <TableHead className="font-bold text-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUpMessages.map((message, index) => (
                  <TableRow 
                    key={message.id}
                    className={`hover:bg-muted/30 transition-colors ${index % 2 === 1 ? 'bg-accent/5' : ''}`}
                  >
                    <TableCell className="font-medium max-w-md">
                      {message.message}
                    </TableCell>
                    <TableCell>{message.customer}</TableCell>
                    <TableCell>{message.phone || 'N/A'}</TableCell>
                    <TableCell>{message.product || 'N/A'}</TableCell>
                    <TableCell>{message.date}</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs"
                        onClick={() => openChatForCustomer(message.phone || '', message.customer)}
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'new-orders':
        return renderNewOrders();
      case 'inventory':
        return renderInventory();
      case 'messages':
        return renderMessages();
      case 'follow-ups':
        return renderFollowUps();
      case 'history':
        return renderHistory();
      case 'data-sources':
        return <DataSourceTester />;
      default:
        return renderNewOrders();
    }
  };

  return (
    <DashboardLayout
      title="Operator Dashboard"
      subtitle="Manage new orders, inventory, and history. All actions are stubbed for demo."
      sidebar={sidebar}
    >
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-muted p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'new-orders' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('new-orders')}
          className="rounded-md"
        >
          New Orders
        </Button>
        <Button
          variant={activeTab === 'inventory' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('inventory')}
          className="rounded-md"
        >
          Inventory
        </Button>
        <Button
          variant={activeTab === 'messages' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('messages')}
          className="rounded-md"
        >
          Messages
        </Button>
        <Button
          variant={activeTab === 'follow-ups' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('follow-ups')}
          className="rounded-md"
        >
          Follow Ups
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
          className="rounded-md"
        >
          History
        </Button>
      </div>

      {/* Split Panel Layout */}
      <div className="h-[calc(100vh-200px)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={isChatOpen ? 70 : 100} minSize={50}>
            <div className="h-full overflow-auto">
              {renderContent()}
            </div>
          </ResizablePanel>
          
          {isChatOpen && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25}>
                     {selectedCustomer && (
                  <ChatPanel
                    isOpen={isChatOpen}
                    onClose={closeChatPanel}
                    customer={selectedCustomer}
                    initialMessages={chatMessages}
                    onMessageSent={() => refreshAllSources()}
                  />
                )}
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </DashboardLayout>
  );
};

export default OperatorDashboard;