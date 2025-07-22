import { User, Client, Receipt, Expense, Activity, Notification, Document } from '../types';

class DatabaseService {
  private dbName = 'arkive-database';
  private dbVersion = 3; // Increment version for cleanup
  private db: IDBDatabase | null = null;

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

          // Users store
          if (!db.objectStoreNames.contains('users')) {
            console.log('Creating users store...');
            const userStore = db.createObjectStore('users', { keyPath: 'id' });
            userStore.createIndex('username', 'username', { unique: true });
            console.log('Users store created');
          }

          // Clients store
          if (!db.objectStoreNames.contains('clients')) {
            const clientStore = db.createObjectStore('clients', { keyPath: 'id' });
            clientStore.createIndex('cnic', 'cnic', { unique: true });
            clientStore.createIndex('name', 'name');
          }

          // Receipts store
          if (!db.objectStoreNames.contains('receipts')) {
            const receiptStore = db.createObjectStore('receipts', { keyPath: 'id' });
            receiptStore.createIndex('clientCnic', 'clientCnic');
            receiptStore.createIndex('date', 'date');
          }

          // Expenses store
          if (!db.objectStoreNames.contains('expenses')) {
            const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
            expenseStore.createIndex('date', 'date');
            expenseStore.createIndex('category', 'category');
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
          }
        };
      } catch (error) {
        console.error('Database: Error during initialization:', error);
        reject(error);
      }
    });
  }

  private async getObjectStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    console.log(`Database: Getting ${storeName} store in ${mode} mode...`);
    if (!this.db) {
      console.error('Database: Database not initialized, attempting to initialize...');
      await this.init();
      if (!this.db) {
        const error = new Error('Failed to initialize database');
        console.error('Database:', error);
        throw error;
      }
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
    const store = await this.getObjectStore('users', 'readwrite');
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newUser);
      request.onsuccess = () => resolve(newUser);
      request.onerror = () => reject(request.error);
    });
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const store = await this.getObjectStore('users');
    const index = store.index('username');
    
    return new Promise((resolve, reject) => {
      const request = index.get(username);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllUsers(): Promise<User[]> {
    const store = await this.getObjectStore('users');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateUser(user: User): Promise<void> {
    const store = await this.getObjectStore('users', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(user);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteUser(userId: string): Promise<void> {
    const store = await this.getObjectStore('users', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(userId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  // Client operations
  async clearStore(storeName: string): Promise<void> {
    const store = await this.getObjectStore(storeName, 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    if (!this.db) {
      await this.init();
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
    };
    
    const notification: Notification = {
      id: crypto.randomUUID(),
      message: `New client registered: ${client.name} (${client.cnic})`,
      type: 'info',
      read: false,
      createdAt: new Date(),
    };
    
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
    const store = await this.getObjectStore('clients');
    const index = store.index('cnic');
    
    return new Promise((resolve, reject) => {
      const request = index.get(cnic);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllClients(): Promise<Client[]> {
    const store = await this.getObjectStore('clients');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateClient(client: Client): Promise<void> {
    const store = await this.getObjectStore('clients', 'readwrite');
    const updatedClient = { ...client, updatedAt: new Date() };
    
    return new Promise((resolve, reject) => {
      const request = store.put(updatedClient);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Receipt operations
  async createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
    if (!this.db) {
      await this.init();
    }
    
    // Create transaction for both receipts and notifications
    const transaction = this.db!.transaction(['receipts', 'notifications'], 'readwrite');
    const receiptStore = transaction.objectStore('receipts');
    const notificationStore = transaction.objectStore('notifications');
    
    const newReceipt: Receipt = {
      ...receipt,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    const notification: Notification = {
      id: crypto.randomUUID(),
      message: `New receipt created: Rs. ${receipt.amount.toLocaleString()} for ${receipt.clientName}`,
      type: 'info',
      read: false,
      createdAt: new Date(),
    };
    
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
    const store = await this.getObjectStore('receipts');
    const index = store.index('clientCnic');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(clientCnic);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllReceipts(): Promise<Receipt[]> {
    const store = await this.getObjectStore('receipts');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateReceipt(receipt: Receipt): Promise<void> {
    const store = await this.getObjectStore('receipts', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(receipt);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteReceipt(id: string): Promise<void> {
    const store = await this.getObjectStore('receipts', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Expense operations
  async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newExpense);
      request.onsuccess = () => resolve(newExpense);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllExpenses(): Promise<Expense[]> {
    const store = await this.getObjectStore('expenses');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateExpense(expense: Expense): Promise<void> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(expense);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteExpense(id: string): Promise<void> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteClient(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
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
    const store = await this.getObjectStore('activities');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Notification operations
  async createNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
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
    const store = await this.getObjectStore('notifications');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markNotificationAsRead(id: string): Promise<void> {
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
    const store = await this.getObjectStore('documents', 'readwrite');
    const newDocument: Document = {
      ...document,
      id: crypto.randomUUID(),
      uploadedAt: new Date(),
      accessLog: [{
        userId: document.uploadedBy,
        timestamp: new Date(),
        action: 'upload'
      }]
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(newDocument);
      request.onsuccess = () => resolve(newDocument);
      request.onerror = () => reject(request.error);
    });
  }

  async getDocumentsByClient(clientCnic: string): Promise<Document[]> {
    const store = await this.getObjectStore('documents');
    const index = store.index('clientCnic');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(clientCnic);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDocuments(): Promise<Document[]> {
    const store = await this.getObjectStore('documents');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async updateDocument(document: Document): Promise<void> {
    const store = await this.getObjectStore('documents', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.put(document);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDocument(id: string): Promise<void> {
    const store = await this.getObjectStore('documents', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async logDocumentAccess(documentId: string, userId: string, action: 'view' | 'download'): Promise<void> {
    const store = await this.getObjectStore('documents', 'readwrite');
    
    return new Promise((resolve, reject) => {
      const getRequest = store.get(documentId);
      getRequest.onsuccess = () => {
        const document = getRequest.result;
        if (document) {
          document.lastAccessed = new Date();
          document.accessLog.push({
            userId,
            timestamp: new Date(),
            action
          });
          
          const putRequest = store.put(document);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Backup and restore
  async exportData(): Promise<string> {
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
      appName: 'Arkive'
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonData: string): Promise<void> {
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
}

export const db = new DatabaseService();