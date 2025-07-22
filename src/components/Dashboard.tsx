import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Receipt, 
  DollarSign, 
  TrendingUp, 
  Bell, 
  Plus,
  X,
  Check,
  AlertCircle,
  Calendar,
  CreditCard,
  BarChart3,
  Shield
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  onPageChange: (page: string) => void;
  onOpenForm: (formType: 'receipt' | 'client' | 'expense' | 'vault') => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export const Dashboard: React.FC<DashboardProps> = ({ onPageChange, onOpenForm }) => {
  const { 
    receipts, 
    clients, 
    expenses, 
    notifications, 
    markNotificationAsRead,
    markAllNotificationsAsRead 
  } = useDatabase();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  
  // Memoized chart data to prevent flickering
  const chartData = React.useMemo(() => {
    const monthlyData = [];
    const currentMonth = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(currentMonth, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthReceipts = receipts.filter(r => 
        r.date >= monthStart && r.date <= monthEnd
      );
      const monthExpenses = expenses.filter(e => 
        e.date >= monthStart && e.date <= monthEnd
      );
      
      const income = monthReceipts.reduce((sum, r) => sum + r.amount, 0);
      const expense = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      monthlyData.push({
        month: format(monthDate, 'MMM yy'),
        income,
        expense,
        profit: income - expense,
        receiptCount: monthReceipts.length,
        clientCount: new Set(monthReceipts.map(r => r.clientCnic)).size,
        avgReceiptValue: monthReceipts.length > 0 ? income / monthReceipts.length : 0
      });
    }
    return monthlyData;
  }, [receipts, expenses]);

  const expenseData = React.useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseCategories = expenses.reduce((acc, expense) => {
      acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(expenseCategories).map(([category, amount]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
    }));
  }, [expenses]);

  // Calculate stats
  const totalRevenue = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  const unreadNotifications = notifications.filter(n => !n.read);

  // Current month stats
  const currentMonth = new Date();
  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);
  
  const currentMonthReceipts = receipts.filter(r => 
    r.date >= currentMonthStart && r.date <= currentMonthEnd
  );
  const currentMonthExpenses = expenses.filter(e => 
    e.date >= currentMonthStart && e.date <= currentMonthEnd
  );
  
  const currentMonthRevenue = currentMonthReceipts.reduce((sum, r) => sum + r.amount, 0);
  const currentMonthExpenseTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (unreadNotifications.length === 0) return;
    
    setIsMarkingAllRead(true);
    try {
      await markAllNotificationsAsRead();
      setTimeout(() => {
        setShowNotifications(false);
        setIsMarkingAllRead(false);
      }, 500);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setIsMarkingAllRead(false);
    }
  };

  // Quick Actions data
  const quickActions = [
    {
      title: 'New Receipt',
      description: 'Add a new receipt entry',
      icon: Receipt,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      action: () => onOpenForm('receipt')
    },
    {
      title: 'Add Client',
      description: 'Register a new client',
      icon: Users,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      action: () => onOpenForm('client')
    },
    {
      title: 'Upload Document',
      description: 'Add to secure vault',
      icon: Shield,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      action: () => onOpenForm('vault')
    },
    {
      title: 'Add Expense',
      description: 'Record a new expense',
      icon: CreditCard,
      color: 'bg-red-500',
      hoverColor: 'hover:bg-red-600',
      action: () => onOpenForm('expense')
    }
  ];

  // Stats cards data
  const statsCards = [
    {
      title: 'Total Revenue',
      value: `Rs. ${totalRevenue.toLocaleString()}`,
      change: currentMonthRevenue > 0 ? `+Rs. ${currentMonthRevenue.toLocaleString()} this month` : 'No revenue this month',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      title: 'Total Clients',
      value: clients.length.toString(),
      change: `${clients.filter(c => new Date(c.createdAt) >= currentMonthStart).length} new this month`,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Total Expenses',
      value: `Rs. ${totalExpenses.toLocaleString()}`,
      change: currentMonthExpenseTotal > 0 ? `Rs. ${currentMonthExpenseTotal.toLocaleString()} this month` : 'No expenses this month',
      icon: DollarSign,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    },
    {
      title: 'Net Profit',
      value: `Rs. ${netProfit.toLocaleString()}`,
      change: `${netProfit >= 0 ? 'Profit' : 'Loss'} margin: ${totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%`,
      icon: TrendingUp,
      color: netProfit >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
    }
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Welcome back! Here's what's happening with your business.
          </p>
        </div>
        
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <Bell className="w-6 h-6" />
            {unreadNotifications.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-bounce">
                {unreadNotifications.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 animate-slideInRight max-h-96 overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notifications
                  </h3>
                  <div className="flex items-center space-x-2">
                    {unreadNotifications.length > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        disabled={isMarkingAllRead}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 transition-colors duration-200"
                      >
                        {isMarkingAllRead ? 'Marking...' : 'Mark All as Read'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 10).map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                        !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-1 rounded-full ${
                          notification.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                          notification.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                          notification.type === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {notification.type === 'success' ? (
                            <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                          ) : notification.type === 'warning' ? (
                            <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                          ) : notification.type === 'error' ? (
                            <AlertCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                          ) : (
                            <Bell className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {format(notification.createdAt, 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        {!notification.read && (
                          <button
                            onClick={() => markNotificationAsRead(notification.id)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => (
          <div
            key={card.title}
            className={`${card.bgColor} p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover-lift transition-all duration-300`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.title}
                </p>
                <p className={`text-2xl font-bold ${card.color} mt-2`}>
                  {card.value}
                </p>
              </div>
              <card.icon className={`w-8 h-8 ${card.color}`} />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {card.change}
            </p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Revenue Trends (Last 6 Months)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={{ stroke: '#d1d5db' }}
                tickLine={{ stroke: '#d1d5db' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `Rs. ${value.toLocaleString()}`, 
                  name === 'income' ? 'Revenue' : name === 'expense' ? 'Expenses' : 'Profit'
                ]}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                labelStyle={{ color: '#374151', fontWeight: 'medium' }}
              />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} name="Expenses" />
              <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={3} name="Profit" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Expense Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expenseData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => 
                  percentage > 8 ? `${category}` : ''
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string, props: any) => [
                  `Rs. ${value.toLocaleString()} (${props.payload.percentage.toFixed(1)}%)`, 
                  'Amount'
                ]}
                contentStyle={{ 
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={action.title}
              onClick={action.action}
              className={`${action.color} ${action.hoverColor} text-white p-6 rounded-lg transition-all duration-300 hover-lift group`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors duration-300">
                  <action.icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
                <Plus className="w-5 h-5 ml-auto group-hover:rotate-90 transition-transform duration-300" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Receipts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Receipts
            </h2>
            <Receipt className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {receipts.slice(0, 5).map((receipt) => (
              <div
                key={receipt.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {receipt.clientName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(receipt.date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  Rs. {receipt.amount.toLocaleString()}
                </span>
              </div>
            ))}
            {receipts.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No receipts yet
              </p>
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Expenses
            </h2>
            <CreditCard className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {expenses.slice(0, 5).map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {expense.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {expense.category} • {format(new Date(expense.date), 'MMM dd, yyyy')}
                  </p>
                </div>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  Rs. {expense.amount.toLocaleString()}
                </span>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No expenses yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};