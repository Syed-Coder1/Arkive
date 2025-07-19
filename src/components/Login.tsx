import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, LogIn, UserPlus, Shield, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/database';

export function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [canCreateAdmin, setCanCreateAdmin] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    checkAdminCount();
  }, []);

  const checkAdminCount = async () => {
    try {
      const users = await db.getAllUsers();
      const adminCount = users.filter(u => u.role === 'admin').length;
      setCanCreateAdmin(adminCount < 2);
    } catch (error) {
      console.error('Error checking admin count:', error);
    }
  };

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
    
    if (!password) {
      setError('Password is required');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        // Check if username already exists
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
          setError('Username already exists');
          return;
        }

        // Create admin account
        await db.createUser({
          username,
          password,
          role: 'admin',
          createdAt: new Date(),
        });

        // Log the account creation
        await db.createActivity({
          userId: 'system',
          action: 'admin_signup',
          details: `New admin account created: ${username}`,
          timestamp: new Date(),
        });

        setSuccess('Admin account created successfully! You can now login.');
        setMode('login');
        setPassword('');
        setConfirmPassword('');
        
        // Recheck admin count
        await checkAdminCount();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-100 dark:border-gray-700">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <div className="mb-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Arkive
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              Secure Tax Management System
            </p>
          </div>
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-3">
            <div className="flex items-center">
              <Shield className="w-3 h-3 mr-1" />
              <span>Encrypted</span>
            </div>
            <div className="flex items-center">
              <Users className="w-3 h-3 mr-1" />
              <span>Multi-User</span>
            </div>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'login'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <LogIn className="w-4 h-4 inline mr-2" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            disabled={!canCreateAdmin}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            } ${!canCreateAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <UserPlus className="w-4 h-4 inline mr-2" />
            Admin Sign Up
          </button>
        </div>

        {/* Admin Limit Notice */}
        {!canCreateAdmin && mode === 'signup' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mr-2" />
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Maximum admin accounts (2) reached. Only login is available.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter your username"
              required
              autoFocus
              minLength={3}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Enter your password"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Confirm your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="text-sm">{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !canCreateAdmin)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {mode === 'login' ? (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Sign In
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Admin Account
                  </>
                )}
              </div>
            )}
          </button>
        </form>

        {/* Security Features */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Security Features
            </p>
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-center">
                <Shield className="w-3 h-3 mr-1 text-green-500" />
                <span>Encrypted Storage</span>
              </div>
              <div className="flex items-center justify-center">
                <Users className="w-3 h-3 mr-1 text-blue-500" />
                <span>Role-based Access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Default Credentials (for development) */}
        {mode === 'login' && (
          <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
            <p className="font-medium mb-1">Default Admin Credentials:</p>
            <p>Username: <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">admin</code></p>
            <p>Password: <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">admin123</code></p>
          </div>
        )}
      </div>
    </div>
  );
}