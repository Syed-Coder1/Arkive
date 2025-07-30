import { User, Client, Receipt, Expense, Activity, Notification, Document } from '../types';
import { firebaseSync } from './firebaseSync';

class DatabaseService {
  private dbName = 'arkive-database';
  private dbVersion = 7; // Increment for Employee Management
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Initialize database on construction
    this.initPromise = this.init();
  }

  // Ensure database is initialized
  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  async init(): Promise<void> {
    console.log('Database: Starting initialization...');
    return new Promise((resolve, reject) => {
      try {
        console.log('Database: Opening database connection...');
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = (event) => {
          console.error('Database: Error opening database:', request.error);
          reject(request.error);
        };

        request.onsuccess = () => {
          console.log('Database: Successfully opened database');
          this.db = request.result;
          
          // Add error handler to database instance
          this.db.onerror = (event) => {
            console.error('Database: Database error:', (event.target as IDBDatabase).error);
          };
          
          resolve();
        };
        
        request.onupgradeneeded = (event) => {
          console.log('Database upgrade needed. Old version:', event.oldVersion, 'New version:', event.newVersion);
          const db = (event.target as IDBOpenDBRequest).result;

          // Clean up old stores if they exist
          const storesToDelete = ['whiteboards'];
          storesToDelete.forEach(storeName => {
            if (db.objectStoreNames.contains(storeName)) {
              db.deleteObjectStore(storeName);
              console.log(`Deleted obsolete store: ${storeName}`);
            }
          });

          // Add sync metadata store
          if (!db.objectStoreNames.contains('sync_metadata')) {
            const syncStore = db.createObjectStore('sync_metadata', { keyPath: 'id' });
            syncStore.createIndex('lastSync', 'lastSync');
            syncStore.createIndex('deviceId', 'deviceId');
          }

          // Users store
          if (!db.objectStoreNames.contains('users')) {
            console.log('Creating users store...');
            const userStore = db.createObjectStore('users', { keyPath: 'id' });
            userStore.createIndex('username', 'username', { unique: true });
            userStore.createIndex('lastModified', 'lastModified');
            console.log('Users store created');
          }

          // Clients store
          if (!db.objectStoreNames.contains('clients')) {
            const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
            clientStore.createIndex('cnic', 'cnic', { unique: true });
            clientStore.createIndex('name', 'name');
            clientStore.createIndex('lastModified', 'lastModified');
          }

          // Receipts store
          if (!db.objectStoreNames.contains('receipts')) {
            const receiptStore = db.createObjectStore('receipts', { keyPath: 'id' });
            receiptStore.createIndex('clientCnic', 'clientCnic');
            receiptStore.createIndex('date', 'date');
            receiptStore.createIndex('lastModified', 'lastModified');
          }

          // Expenses store
          if (!db.objectStoreNames.contains('expenses')) {
            const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
            expenseStore.createIndex('date', 'date');
            expenseStore.createIndex('category', 'category');
            expenseStore.createIndex('lastModified', 'lastModified');
          }

          // Activities store
          if (!db.objectStoreNames.contains('activities')) {
            const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
            activityStore.createIndex('userId', 'userId');
            activityStore.createIndex('timestamp', 'timestamp');
          }

          // Notifications store
          if (!db.objectStoreNames.contains('notifications')) {
            const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
            notificationStore.createIndex('createdAt', 'createdAt');
          }

          // Documents store (Vault)
          if (!db.objectStoreNames.contains('documents')) {
            const documentStore = db.createObjectStore('documents', { keyPath: 'id' });
            documentStore.createIndex('clientCnic', 'clientCnic');
            documentStore.createIndex('fileType', 'fileType');
            documentStore.createIndex('uploadedAt', 'uploadedAt');
            documentStore.createIndex('lastModified', 'lastModified');
          }

          // Employees store
          if (!db.objectStoreNames.contains('employees')) {
            const employeeStore = db.createObjectStore('employees', { keyPath: 'id' });
            employeeStore.createIndex('employeeId', 'employeeId', { unique: true });
            employeeStore.createIndex('username', 'username', { unique: true });
            employeeStore.createIndex('email', 'email', { unique: true });
            employeeStore.createIndex('department', 'department');
            employeeStore.createIndex('status', 'status');
            employeeStore.createIndex('lastModified', 'lastModified');
          }

          // Attendance store
          if (!db.objectStoreNames.contains('attendance')) {
            const attendanceStore = db.createObjectStore('attendance', { keyPath: 'id' });
            attendanceStore.createIndex('employeeId', 'employeeId');
            attendanceStore.createIndex('date', 'date');
            attendanceStore.createIndex('status', 'status');
            attendanceStore.createIndex('lastModified', 'lastModified');
          }
        };
      } catch (error) {
        console.error('Database: Error during initialization:', error);
        reject(error);
      }
    });
  }

  private async getObjectStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.ensureInitialized();
    console.log(`Database: Getting ${storeName} store in ${mode} mode...`);
    if (!this.db) {
      throw new Error('Database failed to initialize');
    }

    try {
      console.log(`Database: Creating transaction for ${storeName}...`);
      const transaction = this.db.transaction([storeName], mode);
      
      transaction.onerror = (event) => {
        console.error(`Database: Transaction error for ${storeName}:`, transaction.error);
      };

      const store = transaction.objectStore(storeName);
      console.log(`Database: Successfully got ${storeName} store`);
      return store;
    } catch (error) {
      console.error(`Database: Error getting ${storeName} store:`, error);
      throw error;
    }
  }

  // User operations
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('users', 'readwrite');
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastModified: new Date(),
    };
    
    firebaseSync.addToSyncQueue({
      type: 'create',
      store: 'users',
      data: newUser
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.add(newUser);
      request.onsuccess = () => resolve(newUser);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('users');
    const index = store.index('username');
    
    return new Promise((resolve, reject) => {
      const request = index.get(username);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('users');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(user: User): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('users', 'readwrite');
    const updatedUser = { ...user, lastModified: new Date() };
    
    firebaseSync.addToSyncQueue({
      type: 'update',
      store: 'users',
      data: updatedUser
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedUser);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('users', 'readwrite');
    
    firebaseSync.addToSyncQueue({
      type: 'delete',
      store: 'users',
      data: { id: userId }
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  // Client operations
  async clearStore(storeName: string): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore(storeName, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Create transaction for both clients and notifications
    const transaction = this.db!.transaction(['clients', 'notifications'], 'readwrite');
    const clientStore = transaction.objectStore('clients');
    const notificationStore = transaction.objectStore('notifications');
    
    const newClient: Client = {
      ...client,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastModified: new Date(),
    };
    
    const notification: Notification = {
      id: crypto.randomUUID(),
      message: `New client registered: ${client.name} (${client.cnic})`,
      type: 'info',
      read: false,
      createdAt: new Date(),
    };
    
    firebaseSync.addToSyncQueue({
      type: 'create',
      store: 'clients',
      data: newClient
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      
      const clientRequest = clientStore.add(newClient);
      const notificationRequest = notificationStore.add(notification);
      
      let clientAdded = false;
      let notificationAdded = false;
      
      const checkComplete = () => {
        if (clientAdded && notificationAdded) {
          resolve(newClient);
        }
      };
      
      clientRequest.onsuccess = () => {
        clientAdded = true;
        checkComplete();
      };
      
      notificationRequest.onsuccess = () => {
        notificationAdded = true;
        checkComplete();
      };
      
      clientRequest.onerror = () => reject(clientRequest.error);
      notificationRequest.onerror = () => reject(notificationRequest.error);
    });
  }

  async getClientByCnic(cnic: string): Promise<Client | null> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('clients');
    const index = store.index('cnic');
    
    return new Promise((resolve, reject) => {
      const request = index.get(cnic);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllClients(): Promise<Client[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('clients');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateClient(client: Client): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('clients', 'readwrite');
    const updatedClient = { ...client, updatedAt: new Date(), lastModified: new Date() };
    
    firebaseSync.addToSyncQueue({
      type: 'update',
      store: 'clients',
      data: updatedClient
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedClient);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Receipt operations
  async createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Create transaction for both receipts and notifications
    const transaction = this.db!.transaction(['receipts', 'notifications'], 'readwrite');
    const receiptStore = transaction.objectStore('receipts');
    const notificationStore = transaction.objectStore('notifications');
    
    const newReceipt: Receipt = {
      ...receipt,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastModified: new Date(),
    };
    
    const notification: Notification = {
      id: crypto.randomUUID(),
      message: `New receipt created: Rs. ${receipt.amount.toLocaleString()} for ${receipt.clientName}`,
      type: 'info',
      read: false,
      createdAt: new Date(),
    };
    
    firebaseSync.addToSyncQueue({
      type: 'create',
      store: 'receipts',
      data: newReceipt
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      
      const receiptRequest = receiptStore.add(newReceipt);
      const notificationRequest = notificationStore.add(notification);
      
      let receiptAdded = false;
      let notificationAdded = false;
      
      const checkComplete = () => {
        if (receiptAdded && notificationAdded) {
          resolve(newReceipt);
        }
      };
      
      receiptRequest.onsuccess = () => {
        receiptAdded = true;
        checkComplete();
      };
      
      notificationRequest.onsuccess = () => {
        notificationAdded = true;
        checkComplete();
      };
      
      receiptRequest.onerror = () => reject(receiptRequest.error);
      notificationRequest.onerror = () => reject(notificationRequest.error);
    });
  }

  async getReceiptsByClient(clientCnic: string): Promise<Receipt[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('receipts');
    const index = store.index('clientCnic');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(clientCnic);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllReceipts(): Promise<Receipt[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('receipts');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateReceipt(receipt: Receipt): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('receipts', 'readwrite');
    const updatedReceipt = { ...receipt, lastModified: new Date() };
    
    firebaseSync.addToSyncQueue({
      type: 'update',
      store: 'receipts',
      data: updatedReceipt
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedReceipt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReceipt(id: string): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('receipts', 'readwrite');
    
    firebaseSync.addToSyncQueue({
      type: 'delete',
      store: 'receipts',
      data: { id }
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Expense operations
  async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('expenses', 'readwrite');
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      lastModified: new Date(),
    };
    
    firebaseSync.addToSyncQueue({
      type: 'create',
      store: 'expenses',
      data: newExpense
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.add(newExpense);
      request.onsuccess = () => resolve(newExpense);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllExpenses(): Promise<Expense[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('expenses');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateExpense(expense: Expense): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('expenses', 'readwrite');
    const updatedExpense = { ...expense, lastModified: new Date() };
    
    firebaseSync.addToSyncQueue({
      type: 'update',
      store: 'expenses',
      data: updatedExpense
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedExpense);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteExpense(id: string): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('expenses', 'readwrite');
    
    firebaseSync.addToSyncQueue({
      type: 'delete',
      store: 'expenses',
      data: { id }
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteClient(id: string): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Delete client and all associated receipts
    const transaction = this.db!.transaction(['clients', 'receipts'], 'readwrite');
    const clientStore = transaction.objectStore('clients');
    const receiptStore = transaction.objectStore('receipts');
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      
      // First get the client to find their CNIC
      const getClientRequest = clientStore.get(id);
      getClientRequest.onsuccess = () => {
        const client = getClientRequest.result;
        if (client) {
          // Delete all receipts for this client
          const receiptIndex = receiptStore.index('clientCnic');
          const receiptRequest = receiptIndex.openCursor(client.cnic);
          
          receiptRequest.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            } else {
              // All receipts deleted, now delete the client
              const deleteClientRequest = clientStore.delete(id);
              deleteClientRequest.onsuccess = () => resolve();
              deleteClientRequest.onerror = () => reject(deleteClientRequest.error);
            }
          };
          
          receiptRequest.onerror = () => reject(receiptRequest.error);
        } else {
          resolve(); // Client doesn't exist
        }
      };
      
      getClientRequest.onerror = () => reject(getClientRequest.error);
    });
  }

  // Activity operations
  async createActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('activities', 'readwrite');
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newActivity);
      request.onsuccess = () => resolve(newActivity);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllActivities(): Promise<Activity[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('activities');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Notification operations
  async createNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('notifications', 'readwrite');
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newNotification);
      request.onsuccess = () => resolve(newNotification);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllNotifications(): Promise<Notification[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('notifications');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('notifications', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const notification = getRequest.result;
        if (notification) {
          notification.read = true;
          const putRequest = store.put(notification);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('notifications', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const notifications = request.result;
        let completed = 0;
        const total = notifications.length;
        
        if (total === 0) {
          resolve();
          return;
        }
        
        notifications.forEach(notification => {
          if (!notification.read) {
            notification.read = true;
            const putRequest = store.put(notification);
            putRequest.onsuccess = () => {
              completed++;
              if (completed === total) {
                resolve();
              }
            };
            putRequest.onerror = () => reject(putRequest.error);
          } else {
            completed++;
            if (completed === total) {
              resolve();
            }
          }
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Document operations (Vault)
  async createDocument(document: Omit<Document, 'id' | 'uploadedAt' | 'accessLog'>): Promise<Document> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('documents', 'readwrite');
    const newDocument: Document = {
      ...document,
      id: crypto.randomUUID(),
      uploadedAt: new Date(),
      lastModified: new Date(),
      accessLog: [{
        userId: document.uploadedBy,
        timestamp: new Date(),
        action: 'upload'
      }]
    };
    
    firebaseSync.addToSyncQueue({
      type: 'create',
      store: 'documents',
      data: newDocument
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.add(newDocument);
      request.onsuccess = () => resolve(newDocument);
      request.onerror = () => reject(request.error);
    });
  }

  async getDocumentsByClient(clientCnic: string): Promise<Document[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('documents');
    const index = store.index('clientCnic');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(clientCnic);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDocuments(): Promise<Document[]> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('documents');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateDocument(document: Document): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('documents', 'readwrite');
    const updatedDocument = { ...document, lastModified: new Date() };
    
    firebaseSync.addToSyncQueue({
      type: 'update',
      store: 'documents',
      data: updatedDocument
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedDocument);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('documents', 'readwrite');
    
    firebaseSync.addToSyncQueue({
      type: 'delete',
      store: 'documents',
      data: { id }
    }).catch(console.warn);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async logDocumentAccess(documentId: string, userId: string, action: 'view' | 'download'): Promise<void> {
    await this.ensureInitialized();
    const store = await this.getObjectStore('documents', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(documentId);
      getRequest.onsuccess = () => {
        const document = getRequest.result;
        if (document) {
          document.lastAccessed = new Date();
          document.lastModified = new Date();
          document.accessLog.push({
            userId,
            timestamp: new Date(),
            action
          });
          
          firebaseSync.addToSyncQueue({
            type: 'update',
            store: 'documents',
            data: document
          }).catch(console.warn).finally(() => {
            const putRequest = store.put(document);
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
          });
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Backup and restore
  async exportData(): Promise<string> {
    await this.ensureInitialized();
    const users = await this.getAllUsers();
    const clients = await this.getAllClients();
    const receipts = await this.getAllReceipts();
    const expenses = await this.getAllExpenses();
    const activities = await this.getAllActivities();
    const notifications = await this.getAllNotifications();
    let documents: Document[] = [];
    try {
      documents = await this.getAllDocuments();
    } catch (error) {
      console.warn('Documents not available for export:', error);
    }

    const data = {
      users,
      clients,
      receipts,
      expenses,
      activities,
      notifications,
      documents,
      exportDate: new Date().toISOString(),
      version: this.dbVersion,
      appName: 'Arkive',
      deviceId: this.getDeviceId()
    };

    return JSON.stringify(data, null, 2);
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('arkive-device-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('arkive-device-id', deviceId);
    }
    return deviceId;
  }

  async getLastSyncTime(): Promise<Date | null> {
    await this.ensureInitialized();
    try {
      const store = await this.getObjectStore('sync_metadata');
      return new Promise((resolve, reject) => {
        const request = store.get('last_sync');
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? new Date(result.timestamp) : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return null;
    }
  }

  async updateLastSyncTime(): Promise<void> {
    await this.ensureInitialized();
    try {
      const store = await this.getObjectStore('sync_metadata', 'readwrite');
      return new Promise((resolve, reject) => {
        const request = store.put({
          id: 'last_sync',
          timestamp: new Date(),
          deviceId: this.getDeviceId()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('Could not update sync time:', error);
    }
  }

  async importData(jsonData: string): Promise<void> {
    await this.ensureInitialized();
    const data = JSON.parse(jsonData);
    
    // Clear existing data
    const stores = ['users', 'clients', 'receipts', 'expenses', 'activities', 'notifications', 'documents'];
    for (const storeName of stores) {
      try {
        const store = await this.getObjectStore(storeName, 'readwrite');
        await new Promise<void>((resolve, reject) => {
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.warn(`Store ${storeName} not available for clearing:`, error);
      }
    }

    // Import new data
    const importStore = async (storeName: string, items: any[]) => {
      try {
        const store = await this.getObjectStore(storeName, 'readwrite');
        for (const item of items) {
          await new Promise<void>((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      } catch (error) {
        console.warn(`Store ${storeName} not available for import:`, error);
      }
    };

    await importStore('users', data.users || []);
    await importStore('clients', data.clients || []);
    await importStore('receipts', data.receipts || []);
    await importStore('expenses', data.expenses || []);
    await importStore('activities', data.activities || []);
    await importStore('notifications', data.notifications || []);
    await importStore('documents', data.documents || []);
  }

         async syncFromFirebase(): Promise<void> {
    try {
      // First fetch all data from Firebase
      const [users, clients, receipts, expenses, activities, notifications, documents, employees, attendance] = await Promise.all([
        firebaseSync.getStoreFromFirebase('users'),
        firebaseSync.getStoreFromFirebase('clients'),
        firebaseSync.getStoreFromFirebase('receipts'),
        firebaseSync.getStoreFromFirebase('expenses'),
        firebaseSync.getStoreFromFirebase('activities'),
        firebaseSync.getStoreFromFirebase('notifications'),
        firebaseSync.getStoreFromFirebase('documents'),
        firebaseSync.getStoreFromFirebase('employees'),
        firebaseSync.getStoreFromFirebase('attendance')
      ]);

      // Define stores to clear
      const stores = ['users', 'clients', 'receipts', 'expenses', 'activities', 'notifications', 'documents', 'employees', 'attendance'];

      // Clear existing data first
      for (const storeName of stores) {
        await this.clearStore(storeName);
      }

      // Helper function to import data
      const importStore = async (storeName: string, items: any[]) => {
        const store = await this.getObjectStore(storeName, 'readwrite');
        for (const item of items) {
          await new Promise<void>((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          });
        }
      };

      // Import all data
      await Promise.all([
        importStore('users', users),
        importStore('clients', clients),
        importStore('receipts', receipts),
        importStore('expenses', expenses),
        importStore('activities', activities),
        importStore('notifications', notifications),
        importStore('documents', documents),
        importStore('employees', employees),
        importStore('attendance', attendance)
      ]);
    } catch (error) {
      console.error('Firebase sync from failed:', error);
      throw error;
    }
  }
// ... existing functions ...

export async function getAllAttendance() {
  // TODO: replace with real DB call
  return [];
}
  async getSyncStatus() {
    return await firebaseSync.getSyncStatus();
  }
}

export const db = new DatabaseService();
