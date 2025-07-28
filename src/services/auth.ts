import { User } from '../types';
import { db } from './database';

class AuthService {
  private currentUser: User | null = null;

  async init(): Promise<void> {
    try {
      console.log('Auth: Initializing database...');
      // Database initialization is now handled automatically
      console.log('Auth: Database initialized');
      
      // Create default admin account if no users exist
      console.log('Auth: Checking for admin user...');
      const adminUser = await db.getUserByUsername('admin');
      if (!adminUser) {
        console.log('Auth: Creating default admin user...');
        await db.createUser({
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          createdAt: new Date(),
        });
        console.log('Auth: Default admin user created');
      } else {
        console.log('Auth: Admin user already exists');
      }
    } catch (error) {
      console.error('Auth: Error during initialization:', error);
    }

    // Check for stored session
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
    }
  }

  async login(username: string, password: string): Promise<User> {
    const user = await db.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      // Log failed login attempt
      await db.createActivity({
        userId: 'system',
        action: 'failed_login',
        details: `Failed login attempt for username: ${username}`,
        timestamp: new Date(),
      });
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await db.updateUser(user);

    this.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));

    // Log activity
    await db.createActivity({
      userId: user.id,
      action: 'login',
      details: `User ${username} logged in`,
      timestamp: new Date(),
    });

    return user;
  }

  async logout(): Promise<void> {
    if (this.currentUser) {
      await db.createActivity({
        userId: this.currentUser.id,
        action: 'logout',
        details: `User ${this.currentUser.username} logged out`,
        timestamp: new Date(),
      });
    }

    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  async register(username: string, password: string, role: 'admin' | 'employee' = 'employee'): Promise<User> {
    // Check if user already exists
    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Check admin limit
    if (role === 'admin') {
      const users = await db.getAllUsers();
      const adminCount = users.filter(u => u.role === 'admin').length;
      if (adminCount >= 2) {
        throw new Error('Maximum number of admin accounts reached');
      }
    }

    // Only admins can create accounts
    if (!this.currentUser || this.currentUser.role !== 'admin') {
      throw new Error('Only administrators can create new accounts');
    }

    const user = await db.createUser({
      username,
      password,
      role,
      createdAt: new Date(),
    });

    // Log activity
    await db.createActivity({
      userId: this.currentUser.id,
      action: 'create_user',
      details: `Admin ${this.currentUser.username} created ${role} account for ${username}`,
      timestamp: new Date(),
    });

    return user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'admin';
  }

  async getAllUsers(): Promise<User[]> {
    if (!this.isAdmin()) {
      throw new Error('Only administrators can view all users');
    }
    return db.getAllUsers();
  }
}

export const auth = new AuthService();