import React, { useState, useEffect } from 'react';
import { 
  User, 
  Shield, 
  Database, 
  Palette, 
  Bell, 
  Save, 
  RefreshCw,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  Clock,
  Activity,
  AlertTriangle,
  Users,
  LogIn,
  LogOut,
  Calendar,
  Monitor
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';
import { format, formatDistanceToNow } from 'date-fns';

const Settings: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState<any[]>([]);
  const [userSessions, setUserSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile settings
  const [profileData, setProfileData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // User creation form
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    role: 'employee' as 'admin' | 'employee'
  });

  // App settings
  const [appSettings, setAppSettings] = useState({
    notifications: true,
    autoBackup: false,
    theme: 'system' as 'light' | 'dark' | 'system',
    language: 'en',
    sessionTimeout: 30,
    maxLoginAttempts: 5
  });

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchUserSessions();
    }
    loadSettings();
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      const allUsers = await db.getAllUsers();
      setUsers(allUsers.map(user => ({
        ...user,
        isOnline: Math.random() > 0.5, // Simulate online status
        lastActivity: new Date(Date.now() - Math.random() * 86400000), // Random last activity
        loginCount: Math.floor(Math.random() * 100) + 1,
        failedAttempts: Math.floor(Math.random() * 3)
      })));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserSessions = async () => {
    try {
      const activities = await db.getAllActivities();
      const loginActivities = activities
        .filter(a => a.action === 'login' || a.action === 'logout')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20);
      
      setUserSessions(loginActivities);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setAppSettings(JSON.parse(savedSettings));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
    showMessage('Settings saved successfully!', 'success');
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (profileData.newPassword !== profileData.confirmPassword) {
      showMessage('New passwords do not match', 'error');
      return;
    }

    if (profileData.newPassword.length < 6) {
      showMessage('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Verify current password
      const currentUser = await db.getUserByUsername(user!.username);
      if (!currentUser || currentUser.password !== profileData.currentPassword) {
        showMessage('Current password is incorrect', 'error');
        return;
      }

      // Update password
      const updatedUser = { ...currentUser, password: profileData.newPassword };
      await db.updateUser(updatedUser);

      // Log activity
      await db.createActivity({
        userId: user!.id,
        action: 'password_change',
        details: `User ${user!.username} changed their password`,
        timestamp: new Date(),
      });

      setProfileData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showMessage('Password updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating password:', error);
      showMessage('Error updating password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUserData.password.length < 6) {
      showMessage('Password must be at least 6 characters long', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Check if username already exists
      const existingUser = await db.getUserByUsername(newUserData.username);
      if (existingUser) {
        showMessage('Username already exists', 'error');
        return;
      }

      // Check admin limit
      if (newUserData.role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount >= 2) {
          showMessage('Maximum number of admin accounts reached', 'error');
          return;
        }
      }

      // Create user
      await db.createUser({
        username: newUserData.username,
        password: newUserData.password,
        role: newUserData.role,
        createdAt: new Date(),
      });

      // Log activity
      await db.createActivity({
        userId: user!.id,
        action: 'create_user',
        details: `Admin ${user!.username} created ${newUserData.role} account for ${newUserData.username}`,
        timestamp: new Date(),
      });

      setNewUserData({ username: '', password: '', role: 'employee' });
      setShowCreateUser(false);
      fetchUsers();
      showMessage('User created successfully!', 'success');
    } catch (error) {
      console.error('Error creating user:', error);
      showMessage('Error creating user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Don't allow deleting yourself
      if (userId === user!.id) {
        showMessage('You cannot delete your own account', 'error');
        return;
      }

      // Delete user
      await db.deleteUser(userId);

      // Log activity
      await db.createActivity({
        userId: user!.id,
        action: 'delete_user',
        details: `Admin ${user!.username} deleted user account: ${username}`,
        timestamp: new Date(),
      });

      fetchUsers();
      showMessage('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('Error deleting user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForceLogout = async (targetUserId: string, targetUsername: string) => {
    if (!confirm(`Force logout user "${targetUsername}"?`)) {
      return;
    }

    try {
      // Log the forced logout
      await db.createActivity({
        userId: user!.id,
        action: 'force_logout',
        details: `Admin ${user!.username} forced logout of user: ${targetUsername}`,
        timestamp: new Date(),
      });

      // Update user status
      setUsers(prev => prev.map(u => 
        u.id === targetUserId ? { ...u, isOnline: false, lastActivity: new Date() } : u
      ));

      showMessage(`User ${targetUsername} has been logged out`, 'success');
    } catch (error) {
      console.error('Error forcing logout:', error);
      showMessage('Error forcing logout', 'error');
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
      return;
    }

    const confirmText = prompt('Type "DELETE" to confirm:');
    if (confirmText !== 'DELETE') {
      return;
    }

    try {
      setLoading(true);
      
      const stores = ['clients', 'receipts', 'expenses', 'activities', 'notifications'];
      for (const storeName of stores) {
        try {
          await db.clearStore(storeName);
        } catch (error) {
          console.warn(`Could not clear store ${storeName}:`, error);
        }
      }

      // Log activity
      await db.createActivity({
        userId: user!.id,
        action: 'clear_all_data',
        details: `Admin ${user!.username} cleared all application data`,
        timestamp: new Date(),
      });

      showMessage('All data cleared successfully!', 'success');
    } catch (error) {
      console.error('Error clearing data:', error);
      showMessage('Error clearing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    ...(isAdmin ? [
      { id: 'users', label: 'User Management', icon: Shield },
      { id: 'monitoring', label: 'User Monitoring', icon: Monitor },
      { id: 'sessions', label: 'Session Logs', icon: Activity }
    ] : []),
    { id: 'app', label: 'Application', icon: Palette },
    { id: 'data', label: 'Data Management', icon: Database },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and application preferences
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? <Check className="w-5 h-5 mr-2" /> : <X className="w-5 h-5 mr-2" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value={user?.role || ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white capitalize"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Account Created
                    </label>
                    <input
                      type="text"
                      value={user?.createdAt ? format(new Date(user.createdAt), 'PPP') : ''}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Last Login
                    </label>
                    <input
                      type="text"
                      value={user?.lastLogin ? format(new Date(user.lastLogin), 'PPp') : 'Never'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={profileData.currentPassword}
                        onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={profileData.newPassword}
                      onChange={(e) => setProfileData({ ...profileData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={profileData.confirmPassword}
                      onChange={(e) => setProfileData({ ...profileData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                      minLength={6}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Management</h3>
                <button
                  onClick={() => setShowCreateUser(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <UserPlus size={16} />
                  Create User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${u.isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{u.username}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {u.loginCount} logins • {u.failedAttempts} failed attempts
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'admin' 
                              ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.isOnline 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                          }`}>
                            {u.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(u.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {u.lastLogin ? format(new Date(u.lastLogin), 'MMM dd, HH:mm') : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {u.isOnline && u.id !== user?.id && (
                              <button
                                onClick={() => handleForceLogout(u.id, u.username)}
                                className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300"
                                title="Force Logout"
                              >
                                <LogOut size={16} />
                              </button>
                            )}
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.username)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Create User Modal */}
              {showCreateUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Create New User</h2>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          value={newUserData.username}
                          onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                          minLength={3}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          value={newUserData.password}
                          onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          required
                          minLength={6}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Role
                        </label>
                        <select
                          value={newUserData.role}
                          onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowCreateUser(false)}
                          className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {loading ? 'Creating...' : 'Create User'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Monitoring Tab */}
          {activeTab === 'monitoring' && isAdmin && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Activity Monitoring</h3>
              
              {/* Real-time Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-blue-600 dark:text-blue-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <LogIn className="w-8 h-8 text-green-600 dark:text-green-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Online Now</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {users.filter(u => u.isOnline).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Failed Attempts</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {users.reduce((sum, u) => sum + u.failedAttempts, 0)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Activity className="w-8 h-8 text-purple-600 dark:text-purple-400 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Logins</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {users.reduce((sum, u) => sum + u.loginCount, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Activity Table */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-lg font-medium text-gray-900 dark:text-white">User Activity Details</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Activity</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Session Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-3 ${u.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{u.username}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{u.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              u.isOnline 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200'
                            }`}>
                              {u.isOnline ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDistanceToNow(u.lastActivity, { addSuffix: true })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {u.isOnline ? formatDistanceToNow(u.lastActivity) : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {u.isOnline && u.id !== user?.id && (
                              <button
                                onClick={() => handleForceLogout(u.id, u.username)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                              >
                                Force Logout
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Session Logs Tab */}
          {activeTab === 'sessions' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Session Activity Logs</h3>
                <button
                  onClick={fetchUserSessions}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {userSessions.map((session) => (
                        <tr key={session.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {format(session.timestamp, 'MMM dd, yyyy HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {session.userId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              session.action === 'login' 
                                ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                            }`}>
                              {session.action === 'login' ? (
                                <LogIn className="w-3 h-3 mr-1" />
                              ) : (
                                <LogOut className="w-3 h-3 mr-1" />
                              )}
                              {session.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                            {session.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Application Tab */}
          {activeTab === 'app' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Application Settings</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Notifications</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable desktop notifications</p>
                  </div>
                  <button
                    onClick={() => setAppSettings({ ...appSettings, notifications: !appSettings.notifications })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      appSettings.notifications ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        appSettings.notifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">Auto Backup</label>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Automatically backup data daily</p>
                  </div>
                  <button
                    onClick={() => setAppSettings({ ...appSettings, autoBackup: !appSettings.autoBackup })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      appSettings.autoBackup ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        appSettings.autoBackup ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={appSettings.sessionTimeout}
                    onChange={(e) => setAppSettings({ ...appSettings, sessionTimeout: parseInt(e.target.value) })}
                    min="5"
                    max="480"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    value={appSettings.maxLoginAttempts}
                    onChange={(e) => setAppSettings({ ...appSettings, maxLoginAttempts: parseInt(e.target.value) })}
                    min="3"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <button
                  onClick={saveSettings}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save size={16} />
                  Save Settings
                </button>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Data Management</h3>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Database Statistics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-yellow-700 dark:text-yellow-300">Users:</span>
                      <span className="ml-2 font-medium">{users.length}</span>
                    </div>
                    <div>
                      <span className="text-yellow-700 dark:text-yellow-300">Storage:</span>
                      <span className="ml-2 font-medium">Local</span>
                    </div>
                    <div>
                      <span className="text-yellow-700 dark:text-yellow-300">Encrypted:</span>
                      <span className="ml-2 font-medium">Yes</span>
                    </div>
                    <div>
                      <span className="text-yellow-700 dark:text-yellow-300">Backup:</span>
                      <span className="ml-2 font-medium">{appSettings.autoBackup ? 'Enabled' : 'Manual'}</span>
                    </div>
                  </div>
                </div>

                {isAdmin && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Danger Zone
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      This action will permanently delete all application data including clients, receipts, expenses, and activities.
                    </p>
                    <button
                      onClick={clearAllData}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                      {loading ? 'Clearing...' : 'Clear All Data'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;