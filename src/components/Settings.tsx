import React, { useState, useEffect } from 'react';
import { 
  User, Settings as SettingsIcon, Shield, Download, Upload, 
  Trash2, Users, Moon, Sun, Monitor, Save, AlertCircle, CheckCircle, Wifi, WifiOff,
  RefreshCw, Cloud, Database
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';
import { firebaseSync } from '../services/firebaseSync';
import { format } from 'date-fns';

const Settings: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ lastSync: Date | null; isOnline: boolean; queueLength: number }>({
    lastSync: null,
    isOnline: navigator.onLine,
    queueLength: 0
  });
  const [syncing, setSyncing] = useState(false);

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
    theme: 'system' as 'light' | 'dark' | 'system',
    notifications: true,
    autoBackup: false,
    language: 'en',
    sessionTimeout: 30,
    maxLoginAttempts: 5
  });

  useEffect(() => {
    loadUsers();
    loadSyncStatus();
    
    // Update sync status periodically
    const interval = setInterval(loadSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await db.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Error loading sync status:', error);
    }
  };

  const loadUsers = async () => {
    if (!isAdmin) return;
    
    try {
      const allUsers = await db.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
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

      // Create user
      await db.createUser({
        username: newUserData.username,
        password: newUserData.password,
        role: newUserData.role,
        createdAt: new Date(),
      });

      setNewUserData({ username: '', password: '', role: 'employee' });
      loadUsers();
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
      loadUsers();
      showMessage('User deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting user:', error);
      showMessage('Error deleting user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      localStorage.setItem('appSettings', JSON.stringify(appSettings));
      
      // Apply theme immediately
      if (appSettings.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (appSettings.theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        // System theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      showMessage('Settings saved successfully!', 'success');
    } catch (error) {
      showMessage('Error saving settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncToFirebase = async () => {
    setSyncing(true);
    try {
      await db.syncToFirebase();
      setMessage({ type: 'success', text: 'Data synced to Firebase successfully!' });
      await loadSyncStatus();
    } catch (error) {
      console.error('Sync to Firebase failed:', error);
      setMessage({ type: 'error', text: 'Failed to sync to Firebase. Please try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncFromFirebase = async () => {
    if (!confirm('This will replace all local data with Firebase data. Are you sure?')) {
      return;
    }
    
    setSyncing(true);
    try {
      await db.syncFromFirebase();
      setMessage({ type: 'success', text: 'Data synced from Firebase successfully!' });
      await loadSyncStatus();
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Sync from Firebase failed:', error);
      setMessage({ type: 'error', text: 'Failed to sync from Firebase. Please try again.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleExportData = async () => {
    try {
      setLoading(true);
      const data = await db.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `arkive-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showMessage('Data exported successfully!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showMessage('Error exporting data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const data = JSON.parse(text);
      await db.importAllData(data);
      showMessage('Data imported successfully!', 'success');
      loadUsers();
    } catch (error) {
      console.error('Import error:', error);
      showMessage('Error importing data', 'error');
    } finally {
      setLoading(false);
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
      await db.clearAllData();
      showMessage('All data cleared successfully!', 'success');
      loadUsers();
    } catch (error) {
      console.error('Error clearing data:', error);
      showMessage('Error clearing data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Monitor },
    { id: 'sync', label: 'Sync & Backup', icon: Database },
    { id: 'users', label: 'User Management', icon: Users, adminOnly: true },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your account and application preferences
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          {syncStatus.isOnline ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className={syncStatus.isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
            {syncStatus.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg border ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            {message.text}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              if (tab.adminOnly && !isAdmin) return null;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
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
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={profileData.currentPassword}
                      onChange={(e) => setProfileData({ ...profileData, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
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

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Appearance Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor }
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setAppSettings({ ...appSettings, theme: value as any })}
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                          appSettings.theme === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon size={16} />
                        <span className="text-sm font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Language
                  </label>
                  <select
                    value={appSettings.language}
                    onChange={(e) => setAppSettings({ ...appSettings, language: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="ur">اردو (Urdu)</option>
                  </select>
                </div>

                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save Appearance Settings'}
                </button>
              </div>
            </div>
          )}

          {/* Sync & Backup Tab */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* Sync Status */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Sync Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    {syncStatus.isOnline ? (
                      <Wifi className="w-5 h-5 text-green-500" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {syncStatus.isOnline ? 'Online' : 'Offline'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Connection Status
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Cloud className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {syncStatus.lastSync ? format(syncStatus.lastSync, 'MMM dd, HH:mm') : 'Never'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last Sync
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {syncStatus.queueLength}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Pending Changes
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Firebase Sync Controls */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Firebase Sync
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleSyncToFirebase}
                    disabled={syncing || !syncStatus.isOnline}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5" />
                    )}
                    {syncing ? 'Syncing...' : 'Sync to Firebase'}
                  </button>
                  
                  <button
                    onClick={handleSyncFromFirebase}
                    disabled={syncing || !syncStatus.isOnline}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    {syncing ? 'Syncing...' : 'Sync from Firebase'}
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Sync your data with Firebase for real-time collaboration across devices.
                </p>
              </div>

              {/* Backup & Restore */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Backup & Restore
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleExportData}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-5 h-5" />
                    {loading ? 'Exporting...' : 'Export Data'}
                  </button>
                  
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={loading}
                    />
                    <button
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-5 h-5" />
                      {loading ? 'Importing...' : 'Import Data'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Export your data for backup or import from a previous backup.
                </p>
              </div>
            </div>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">User Management</h3>
                <button
                  onClick={() => setActiveTab('create-user')}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Users size={16} />
                  Create User
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Username
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {u.username}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {format(new Date(u.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Create User Form */}
          {activeTab === 'create-user' && isAdmin && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('users')}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  ← Back to Users
                </button>
              </div>

              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Create New User</h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4 max-w-md">
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
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          )}

          {/* Advanced Tab */}
          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Advanced Settings</h3>
              
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

                {isAdmin && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Danger Zone
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      This action will permanently delete all application data.
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

                <button
                  onClick={saveSettings}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {loading ? 'Saving...' : 'Save Advanced Settings'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;