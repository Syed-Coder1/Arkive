import React, { useState } from 'react';
import { Plus, Calendar, Download, Upload, Bell, CheckCircle, AlertTriangle, Edit, Trash2, CheckCheck, Activity, Users, Search } from 'lucide-react';
import { useExpenses, useActivities, useNotifications } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { db } from '../services/database';
import { subMonths } from 'date-fns';
import { exportService } from '../services/export';

interface ExpensesProps {
  showForm?: boolean;
  onCloseForm?: () => void;
}

export function Expenses({ showForm: externalShowForm, onCloseForm }: ExpensesProps) {
  const { expenses, createExpense, loading } = useExpenses();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(externalShowForm || false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'office' as 'office' | 'utilities' | 'supplies' | 'maintenance' | 'food' | 'rent' | 'salary' | 'other',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  React.useEffect(() => {
    if (externalShowForm !== undefined) {
      setShowForm(externalShowForm);
    }
  }, [externalShowForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createExpense({
        ...formData,
        amount: parseFloat(formData.amount),
        date: new Date(formData.date),
        createdBy: user!.id,
      });
      
      setFormData({
        description: '',
        amount: '',
        category: 'office' as const,
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setShowForm(false);
      
      if (onCloseForm) {
        onCloseForm();
      }
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const handleEdit = (expense: any) => {
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: format(expense.date, 'yyyy-MM-dd'),
    });
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await db.deleteExpense(expenseId);
        window.location.reload();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const updatedExpense = {
        ...editingExpense,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date),
      };
      
      await db.updateExpense(updatedExpense);
      
      setFormData({
        description: '',
        amount: '',
        category: 'office',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setEditingExpense(null);
      setShowForm(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-600 dark:text-gray-400">Total: Rs. {totalExpenses.toLocaleString()}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} />
          New Expense
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {format(expense.date, 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 capitalize">
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400">
                    Rs. {expense.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Edit Expense"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Delete Expense"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-0 flex items-center justify-center z-50 p-4 min-h-screen overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              {editingExpense ? 'Edit Expense' : 'New Expense'}
            </h2>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <form onSubmit={editingExpense ? handleUpdate : handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter description"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="office">Office</option>
                  <option value="utilities">Utilities</option>
                  <option value="supplies">Supplies</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="food">Food</option>
                  <option value="rent">Rent</option>
                  <option value="salary">Salary</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              </form>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    if (onCloseForm) {
                      onCloseForm();
                    }
                    setEditingExpense(null);
                    setFormData({
                      description: '',
                      amount: '',
                      category: 'office' as const,
                      date: format(new Date(), 'yyyy-MM-dd'),
                    });
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingExpense ? 'Update Expense' : 'Create Expense'}
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActivityLog() {
  const { activities, loading } = useActivities();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.userId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = !filterAction || activity.action === filterAction;
    const matchesUser = !filterUser || activity.userId === filterUser;

    return matchesSearch && matchesAction && matchesUser;
  });

  const uniqueActions = [...new Set(activities.map(a => a.action))];
  const uniqueUsers = [...new Set(activities.map(a => a.userId))];

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return '🔐';
    if (action.includes('create')) return '➕';
    if (action.includes('update')) return '✏️';
    if (action.includes('delete')) return '🗑️';
    if (action.includes('export')) return '📤';
    if (action.includes('backup')) return '💾';
    return '📋';
  };

  const getActionColor = (action: string) => {
    if (action.includes('login') || action.includes('logout')) return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    if (action.includes('create')) return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (action.includes('update')) return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    if (action.includes('delete')) return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    if (action.includes('export') || action.includes('backup')) return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    return 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Comprehensive audit trail of all system activities and user actions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activities.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Activities</p>
              <p className="text-2xl font-bold text-green-600">
                {activities.filter(a => 
                  format(a.timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                ).length}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Users</p>
              <p className="text-2xl font-bold text-purple-600">{uniqueUsers.length}</p>
            </div>
            <Users className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Action Types</p>
              <p className="text-2xl font-bold text-orange-600">{uniqueActions.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
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
                placeholder="Search activities, details, or users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Action Type</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Actions</option>
              {uniqueActions.map(action => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">User</label>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Users</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Activity Timeline ({filteredActivities.length} activities)
          </h2>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {filteredActivities.map((activity, index) => (
              <div 
                key={activity.id} 
                className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-300 hover:shadow-md stagger-item"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-white dark:bg-gray-600 rounded-full flex items-center justify-center text-lg border-2 border-gray-200 dark:border-gray-500">
                    {getActionIcon(activity.action)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                        {activity.action}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        by {activity.userId}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {format(activity.timestamp, 'MMM dd, yyyy')}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {format(activity.timestamp, 'HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {activity.details}
                  </p>
                </div>
              </div>
            ))}
            
            {filteredActivities.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activities found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {activities.length === 0 
                    ? "No activities have been recorded yet"
                    : "Try adjusting your search or filter criteria"
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Most Active Users</h3>
          <div className="space-y-3">
            {uniqueUsers.slice(0, 5).map(user => {
              const userActivities = activities.filter(a => a.userId === user);
              return (
                <div key={user} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{user}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {userActivities.length} activities
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Common Actions</h3>
          <div className="space-y-3">
            {uniqueActions.slice(0, 5).map(action => {
              const actionCount = activities.filter(a => a.action === action).length;
              return (
                <div key={action} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getActionIcon(action)}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{action}</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {actionCount} times
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Activity Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Activity Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {activities.filter(a => 
                (new Date().getTime() - a.timestamp.getTime()) < 24 * 60 * 60 * 1000
              ).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Activities in last 24 hours</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activities.filter(a => a.action.includes('create')).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total creations</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {activities.filter(a => a.action.includes('login')).length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Login sessions</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BackupRestore() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await db.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arkive-backup-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      await db.importData(text);
      alert('Data imported successfully! Please refresh the page.');
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing data. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Backup & Restore</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your data backups and restore from previous exports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Download className="w-6 h-6 text-green-600 dark:text-green-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Export Data</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Export all your data including clients, receipts, expenses, and activities.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Download size={20} />
            {exporting ? 'Exporting...' : 'Export Data'}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-4">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Import Data</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Import data from a previously exported backup file.
          </p>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={importing}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {importing && (
              <div className="absolute inset-0 bg-white dark:bg-gray-700 bg-opacity-75 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Important Notes</h3>
        <ul className="text-yellow-700 dark:text-yellow-300 space-y-1 text-sm">
          <li>• Regular backups are recommended to prevent data loss</li>
          <li>• Importing data will replace all existing data</li>
          <li>• Keep backup files in a secure location</li>
          <li>• For sync across multiple devices, use the same backup file</li>
          <li>• Backup files contain sensitive business information</li>
        </ul>
      </div>
    </div>
  );
}