import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  Bell,
  Plus,
  X,
  Send,
  Filter,
  Search
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { db } from '../services/database';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

export function AdvancedAnalytics() {
  const { receipts, clients, expenses } = useDatabase();
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Calculate comprehensive analytics
  const analytics = React.useMemo(() => {
    const now = new Date();
    const periods = {
      '3months': 3,
      '6months': 6,
      '12months': 12,
      '24months': 24
    };

    const monthsToShow = periods[selectedPeriod as keyof typeof periods] || 6;
    
    // Monthly data for trends
    const monthlyData = [];
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthReceipts = receipts.filter(r => 
        r.date >= monthStart && r.date <= monthEnd
      );
      const monthExpenses = expenses.filter(e => 
        e.date >= monthStart && e.date <= monthEnd
      );
      
      const revenue = monthReceipts.reduce((sum, r) => sum + r.amount, 0);
      const expense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const profit = revenue - expense;
      const clientCount = new Set(monthReceipts.map(r => r.clientCnic)).size;
      const avgReceiptValue = monthReceipts.length > 0 ? revenue / monthReceipts.length : 0;
      
      monthlyData.push({
        month: format(monthDate, 'MMM yy'),
        revenue,
        expense,
        profit,
        clientCount,
        receiptCount: monthReceipts.length,
        avgReceiptValue,
        profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0
      });
    }

    // Client performance analysis
    const clientPerformance = clients.map(client => {
      const clientReceipts = receipts.filter(r => r.clientCnic === client.cnic);
      const totalRevenue = clientReceipts.reduce((sum, r) => sum + r.amount, 0);
      const lastPayment = clientReceipts.length > 0 
        ? Math.max(...clientReceipts.map(r => r.date.getTime()))
        : 0;
      const daysSinceLastPayment = lastPayment > 0 
        ? Math.floor((now.getTime() - lastPayment) / (1000 * 60 * 60 * 24))
        : Infinity;
      
      return {
        ...client,
        totalRevenue,
        receiptCount: clientReceipts.length,
        avgReceiptValue: clientReceipts.length > 0 ? totalRevenue / clientReceipts.length : 0,
        lastPayment: lastPayment > 0 ? new Date(lastPayment) : null,
        daysSinceLastPayment,
        riskScore: daysSinceLastPayment > 90 ? 'high' : daysSinceLastPayment > 30 ? 'medium' : 'low'
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Revenue forecasting (simple linear regression)
    const recentMonths = monthlyData.slice(-6);
    const avgGrowthRate = recentMonths.length > 1 
      ? recentMonths.reduce((sum, month, index) => {
          if (index === 0) return 0;
          const prevRevenue = recentMonths[index - 1].revenue;
          const growthRate = prevRevenue > 0 ? ((month.revenue - prevRevenue) / prevRevenue) * 100 : 0;
          return sum + growthRate;
        }, 0) / (recentMonths.length - 1)
      : 0;

    const currentRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0;
    const forecastedRevenue = currentRevenue * (1 + (avgGrowthRate / 100));

    // Payment method analysis
    const paymentMethods = receipts.reduce((acc, receipt) => {
      acc[receipt.paymentMethod] = (acc[receipt.paymentMethod] || 0) + receipt.amount;
      return acc;
    }, {} as Record<string, number>);

    const paymentMethodData = Object.entries(paymentMethods).map(([method, amount]) => ({
      method: method.replace('_', ' ').toUpperCase(),
      amount,
      percentage: (amount / receipts.reduce((sum, r) => sum + r.amount, 0)) * 100
    }));

    // Expense category analysis
    const expenseCategories = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    const expenseCategoryData = Object.entries(expenseCategories).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      percentage: (amount / expenses.reduce((sum, e) => sum + e.amount, 0)) * 100
    }));

    return {
      monthlyData,
      clientPerformance,
      avgGrowthRate,
      forecastedRevenue,
      paymentMethodData,
      expenseCategoryData,
      totalRevenue: receipts.reduce((sum, r) => sum + r.amount, 0),
      totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
      totalProfit: receipts.reduce((sum, r) => sum + r.amount, 0) - expenses.reduce((sum, e) => sum + e.amount, 0),
      activeClients: clientPerformance.filter(c => c.daysSinceLastPayment < 90).length,
      atRiskClients: clientPerformance.filter(c => c.riskScore === 'high').length
    };
  }, [receipts, clients, expenses, selectedPeriod]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="12months">Last 12 Months</option>
            <option value="24months">Last 24 Months</option>
          </select>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="revenue">Revenue Focus</option>
            <option value="profit">Profit Focus</option>
            <option value="clients">Client Focus</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Growth Rate</p>
              <p className={`text-2xl font-bold ${analytics.avgGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.avgGrowthRate >= 0 ? '+' : ''}{analytics.avgGrowthRate.toFixed(1)}%
              </p>
            </div>
            {analytics.avgGrowthRate >= 0 ? (
              <TrendingUp className="w-8 h-8 text-green-500" />
            ) : (
              <TrendingDown className="w-8 h-8 text-red-500" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Average monthly growth rate
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Forecasted Revenue</p>
              <p className="text-2xl font-bold text-blue-600">
                Rs. {analytics.forecastedRevenue.toLocaleString()}
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Next month projection
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Clients</p>
              <p className="text-2xl font-bold text-green-600">
                {analytics.activeClients}
              </p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Paid within 90 days
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">At Risk Clients</p>
              <p className="text-2xl font-bold text-red-600">
                {analytics.atRiskClients}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No payment in 90+ days
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {selectedMetric === 'revenue' ? 'Revenue Trends' : 
             selectedMetric === 'profit' ? 'Profit Analysis' : 'Client Activity'}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            {selectedMetric === 'revenue' ? (
              <AreaChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Revenue']}
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} strokeWidth={3} />
              </AreaChart>
            ) : selectedMetric === 'profit' ? (
              <LineChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `Rs. ${value.toLocaleString()}`, 
                    name === 'profit' ? 'Profit' : name === 'profitMargin' ? 'Profit Margin %' : name
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={3} name="profit" />
                <Line type="monotone" dataKey="profitMargin" stroke="#F59E0B" strokeWidth={2} name="profitMargin" />
              </LineChart>
            ) : (
              <BarChart data={analytics.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-30" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    value, 
                    name === 'clientCount' ? 'Active Clients' : 'Receipts'
                  ]}
                  contentStyle={{ 
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="clientCount" fill="#8B5CF6" name="clientCount" />
                <Bar dataKey="receiptCount" fill="#EC4899" name="receiptCount" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Payment Method Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.paymentMethodData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ method, percentage }) => 
                  percentage > 5 ? `${method} (${percentage.toFixed(1)}%)` : ''
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {analytics.paymentMethodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, 'Amount']}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Client Performance Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Top Client Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Receipts</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {analytics.clientPerformance.slice(0, 10).map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{client.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{client.type}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                    Rs. {client.totalRevenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {client.receiptCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    Rs. {client.avgReceiptValue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {client.lastPayment ? format(client.lastPayment, 'MMM dd, yyyy') : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.riskScore === 'low' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                      client.riskScore === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                      'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}>
                      {client.riskScore.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Business Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Revenue Growth</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {analytics.avgGrowthRate >= 0 
                    ? `Business is growing at ${analytics.avgGrowthRate.toFixed(1)}% monthly rate`
                    : `Revenue declining by ${Math.abs(analytics.avgGrowthRate).toFixed(1)}% monthly`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Client Retention</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {analytics.atRiskClients} clients haven't paid in 90+ days and need attention
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <DollarSign className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Profit Margin</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Current profit margin: {analytics.totalRevenue > 0 
                    ? ((analytics.totalProfit / analytics.totalRevenue) * 100).toFixed(1)
                    : 0
                  }%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommendations</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Focus on High-Value Clients</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Top 20% of clients generate {
                  ((analytics.clientPerformance.slice(0, Math.ceil(analytics.clientPerformance.length * 0.2))
                    .reduce((sum, c) => sum + c.totalRevenue, 0) / analytics.totalRevenue) * 100).toFixed(0)
                }% of revenue
              </p>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-200">Payment Method Optimization</p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {analytics.paymentMethodData[0]?.method || 'Cash'} is most popular - consider incentives for digital payments
              </p>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Client Re-engagement</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Reach out to {analytics.atRiskClients} at-risk clients to prevent churn
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SmartNotifications() {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useDatabase();
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [customNotification, setCustomNotification] = useState({
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'success'
  });

  // Generate smart notifications based on business data
  const generateSmartNotifications = async () => {
    const { receipts, clients, expenses } = await Promise.all([
      db.getAllReceipts(),
      db.getAllClients(),
      db.getAllExpenses()
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Check for inactive clients
    const inactiveClients = clients.filter(client => {
      const clientReceipts = receipts.filter(r => r.clientCnic === client.cnic);
      const lastPayment = clientReceipts.length > 0 
        ? Math.max(...clientReceipts.map(r => r.date.getTime()))
        : 0;
      return lastPayment > 0 && lastPayment < ninetyDaysAgo.getTime();
    });

    // Check for high monthly expenses
    const currentMonthExpenses = expenses.filter(e => 
      e.date.getMonth() === now.getMonth() && e.date.getFullYear() === now.getFullYear()
    );
    const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const avgMonthlyExpenses = expenses.length > 0 
      ? expenses.reduce((sum, e) => sum + e.amount, 0) / 12 
      : 0;

    // Check for revenue milestones
    const totalRevenue = receipts.reduce((sum, r) => sum + r.amount, 0);
    const milestones = [100000, 500000, 1000000, 5000000];
    const nextMilestone = milestones.find(m => m > totalRevenue);

    const smartNotifications = [];

    if (inactiveClients.length > 0) {
      smartNotifications.push({
        message: `${inactiveClients.length} clients haven't made payments in 90+ days. Consider reaching out.`,
        type: 'warning' as const
      });
    }

    if (currentMonthTotal > avgMonthlyExpenses * 1.5) {
      smartNotifications.push({
        message: `Monthly expenses are 50% higher than average (Rs. ${currentMonthTotal.toLocaleString()}).`,
        type: 'warning' as const
      });
    }

    if (nextMilestone && totalRevenue > nextMilestone * 0.9) {
      smartNotifications.push({
        message: `You're close to reaching Rs. ${nextMilestone.toLocaleString()} in total revenue!`,
        type: 'success' as const
      });
    }

    // Create notifications in database
    for (const notification of smartNotifications) {
      await db.createNotification({
        ...notification,
        read: false,
        createdAt: new Date()
      });
    }
  };

  const handleCreateCustomNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customNotification.message.trim()) {
      alert('Please enter a message');
      return;
    }

    try {
      await db.createNotification({
        message: customNotification.message,
        type: customNotification.type,
        read: false,
        createdAt: new Date()
      });

      setCustomNotification({ message: '', type: 'info' });
      setShowCreateForm(false);
      window.location.reload();
    } catch (error) {
      console.error('Error creating notification:', error);
      alert('Error creating notification');
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = !searchTerm || 
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || notification.type === filterType;
    return matchesSearch && matchesType;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-600" />
            Smart Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            AI-powered business alerts and custom notifications
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateSmartNotifications}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Bell size={20} />
            Generate Smart Alerts
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Create Custom
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length}</p>
            </div>
            <Bell className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Warnings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {notifications.filter(n => n.type === 'warning').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Success</p>
              <p className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.type === 'success').length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search notifications..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
          </div>

          <div className="flex items-end">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsAsRead}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Mark All as Read
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border transition-all duration-300 hover:shadow-md ${
                !notification.read 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full ${
                    notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                    notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                    notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }`}>
                    {notification.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : notification.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    ) : notification.type === 'error' ? (
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    ) : (
                      <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format(notification.createdAt, 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!notification.read && (
                    <button
                      onClick={() => markNotificationAsRead(notification.id)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle size={16} />
                    </button>
                  )}
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    notification.type === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                    notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                    notification.type === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                    'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  }`}>
                    {notification.type.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {filteredNotifications.length === 0 && (
            <div className="text-center py-8">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notifications found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {notifications.length === 0 
                  ? "Generate smart alerts or create custom notifications to get started"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Custom Notification Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create Custom Notification</h2>
            
            <form onSubmit={handleCreateCustomNotification} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message *
                </label>
                <textarea
                  value={customNotification.message}
                  onChange={(e) => setCustomNotification({ ...customNotification, message: e.target.value })}
                  placeholder="Enter notification message"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Type *
                </label>
                <select
                  value={customNotification.type}
                  onChange={(e) => setCustomNotification({ ...customNotification, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="success">Success</option>
                </select>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}