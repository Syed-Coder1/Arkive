import { User, Client, Receipt, Expense, Activity, Notification, Document, Employee, Attendance } from '../types';
import { firebaseSync } from './firebaseSync';

class DatabaseService {
  private dbName = 'arkive-database';
  private dbVersion = 7;
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.init();
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initPromise) await this.initPromise;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = request.result;

        ['whiteboards'].forEach((s) => {
          if (db.objectStoreNames.contains(s)) db.deleteObjectStore(s);
        });

        if (!db.objectStoreNames.contains('sync_metadata'))
          db.createObjectStore('sync_metadata', { keyPath: 'id' })
            .createIndex('lastSync', 'lastSync');

        ['users', 'clients', 'receipts', 'expenses', 'activities', 'notifications', 'documents', 'employees', 'attendance']
          .forEach((store) => {
            switch (store) {
              case 'users':
                db.createObjectStore('users', { keyPath: 'id' })
                  .createIndex('username', 'username', { unique: true });
                break;
              case 'clients':
                db.createObjectStore('clients', { keyPath: 'id' })
                  .createIndex('cnic', 'cnic', { unique: true });
                break;
              case 'receipts':
                db.createObjectStore('receipts', { keyPath: 'id' })
                  .createIndex('clientCnic', 'clientCnic');
                break;
              case 'expenses':
                db.createObjectStore('expenses', { keyPath: 'id' })
                  .createIndex('date', 'date');
                break;
              case 'activities':
                db.createObjectStore('activities', { keyPath: 'id' })
                  .createIndex('userId', 'userId');
                break;
              case 'notifications':
                db.createObjectStore('notifications', { keyPath: 'id' })
                  .createIndex('createdAt', 'createdAt');
                break;
              case 'documents':
                db.createObjectStore('documents', { keyPath: 'id' })
                  .createIndex('clientCnic', 'clientCnic');
                break;
              case 'employees':
                db.createObjectStore('employees', { keyPath: 'id' })
                  .createIndex('employeeId', 'employeeId', { unique: true });
                break;
              case 'attendance':
                db.createObjectStore('attendance', { keyPath: 'id' })
                  .createIndex('employeeId', 'employeeId')
                  .createIndex('date', 'date');
                break;
            }
          });
      };
    });
  }

  private async getObjectStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Database failed to initialize');
    return this.db.transaction([storeName], mode).objectStore(storeName);
  }

  // ------------------ USERS ------------------
  async createUser(user: Omit<User, 'id'>): Promise<User> {
    const store = await this.getObjectStore('users', 'readwrite');
    const newUser: User = { ...user, id: crypto.randomUUID(), createdAt: new Date(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'create', store: 'users', data: newUser }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.add(newUser);
      req.onsuccess = () => resolve(newUser);
      req.onerror = () => reject(req.error);
    });
  }
  async getUserByUsername(username: string): Promise<User | null> {
    const store = await this.getObjectStore('users');
    const index = store.index('username');
    return new Promise((resolve, reject) => {
      const req = index.get(username);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllUsers(): Promise<User[]> {
    const store = await this.getObjectStore('users');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async updateUser(user: User): Promise<void> {
    const store = await this.getObjectStore('users', 'readwrite');
    const updated = { ...user, lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'update', store: 'users', data: updated }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async deleteUser(userId: string): Promise<void> {
    const store = await this.getObjectStore('users', 'readwrite');
    firebaseSync.addToSyncQueue({ type: 'delete', store: 'users', data: { id: userId } }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.delete(userId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ CLIENTS ------------------
  async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const store = await this.getObjectStore('clients', 'readwrite');
    const newClient: Client = { ...client, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'create', store: 'clients', data: newClient }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.add(newClient);
      req.onsuccess = () => resolve(newClient);
      req.onerror = () => reject(req.error);
    });
  }
  async getClientByCnic(cnic: string): Promise<Client | null> {
    const store = await this.getObjectStore('clients');
    const index = store.index('cnic');
    return new Promise((resolve, reject) => {
      const req = index.get(cnic);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllClients(): Promise<Client[]> {
    const store = await this.getObjectStore('clients');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async updateClient(client: Client): Promise<void> {
    const store = await this.getObjectStore('clients', 'readwrite');
    const updated = { ...client, updatedAt: new Date(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'update', store: 'clients', data: updated }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async deleteClient(id: string): Promise<void> {
    const store = await this.getObjectStore('clients', 'readwrite');
    firebaseSync.addToSyncQueue({ type: 'delete', store: 'clients', data: { id } }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ RECEIPTS ------------------
  async createReceipt(receipt: Omit<Receipt, 'id' | 'createdAt'>): Promise<Receipt> {
    const store = await this.getObjectStore('receipts', 'readwrite');
    const newReceipt: Receipt = { ...receipt, id: crypto.randomUUID(), createdAt: new Date(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'create', store: 'receipts', data: newReceipt }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.add(newReceipt);
      req.onsuccess = () => resolve(newReceipt);
      req.onerror = () => reject(req.error);
    });
  }
  async getReceiptsByClient(clientCnic: string): Promise<Receipt[]> {
    const store = await this.getObjectStore('receipts');
    const index = store.index('clientCnic');
    return new Promise((resolve, reject) => {
      const req = index.getAll(clientCnic);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllReceipts(): Promise<Receipt[]> {
    const store = await this.getObjectStore('receipts');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async updateReceipt(receipt: Receipt): Promise<void> {
    const store = await this.getObjectStore('receipts', 'readwrite');
    const updated = { ...receipt, lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'update', store: 'receipts', data: updated }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async deleteReceipt(id: string): Promise<void> {
    const store = await this.getObjectStore('receipts', 'readwrite');
    firebaseSync.addToSyncQueue({ type: 'delete', store: 'receipts', data: { id } }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ EXPENSES ------------------
  async createExpense(expense: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    const newExpense: Expense = { ...expense, id: crypto.randomUUID(), createdAt: new Date(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'create', store: 'expenses', data: newExpense }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.add(newExpense);
      req.onsuccess = () => resolve(newExpense);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllExpenses(): Promise<Expense[]> {
    const store = await this.getObjectStore('expenses');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async updateExpense(expense: Expense): Promise<void> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    const updated = { ...expense, lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'update', store: 'expenses', data: updated }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async deleteExpense(id: string): Promise<void> {
    const store = await this.getObjectStore('expenses', 'readwrite');
    firebaseSync.addToSyncQueue({ type: 'delete', store: 'expenses', data: { id } }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ ACTIVITIES ------------------
  async createActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    const store = await this.getObjectStore('activities', 'readwrite');
    const newActivity: Activity = { ...activity, id: crypto.randomUUID() };
    return new Promise((resolve, reject) => {
      const req = store.add(newActivity);
      req.onsuccess = () => resolve(newActivity);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllActivities(): Promise<Activity[]> {
    const store = await this.getObjectStore('activities');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ NOTIFICATIONS ------------------
  async createNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
    const store = await this.getObjectStore('notifications', 'readwrite');
    const newNotification: Notification = { ...notification, id: crypto.randomUUID() };
    return new Promise((resolve, reject) => {
      const req = store.add(newNotification);
      req.onsuccess = () => resolve(newNotification);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllNotifications(): Promise<Notification[]> {
    const store = await this.getObjectStore('notifications');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async markNotificationAsRead(id: string): Promise<void> {
    const store = await this.getObjectStore('notifications', 'readwrite');
    return new Promise((resolve, reject) => {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const n = getReq.result;
        if (n) {
          n.read = true;
          const putReq = store.put(n);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        } else resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }
  async markAllNotificationsAsRead(): Promise<void> {
    const store = await this.getObjectStore('notifications', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result;
        let count = 0;
        if (!list.length) return resolve();
        list.forEach(n => {
          if (!n.read) {
            n.read = true;
            const putReq = store.put(n);
            putReq.onsuccess = () => (++count === list.length && resolve());
            putReq.onerror = () => reject(putReq.error);
          } else if (++count === list.length) resolve();
        });
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ DOCUMENTS ------------------
  async createDocument(doc: Omit<Document, 'id' | 'uploadedAt' | 'accessLog'>): Promise<Document> {
    const store = await this.getObjectStore('documents', 'readwrite');
    const newDoc: Document = { ...doc, id: crypto.randomUUID(), uploadedAt: new Date(), lastModified: new Date(), accessLog: [{ userId: doc.uploadedBy, timestamp: new Date(), action: 'upload' }] };
    firebaseSync.addToSyncQueue({ type: 'create', store: 'documents', data: newDoc }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.add(newDoc);
      req.onsuccess = () => resolve(newDoc);
      req.onerror = () => reject(req.error);
    });
  }
  async getDocumentsByClient(clientCnic: string): Promise<Document[]> {
    const store = await this.getObjectStore('documents');
    const index = store.index('clientCnic');
    return new Promise((resolve, reject) => {
      const req = index.getAll(clientCnic);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllDocuments(): Promise<Document[]> {
    const store = await this.getObjectStore('documents');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async updateDocument(doc: Document): Promise<void> {
    const store = await this.getObjectStore('documents', 'readwrite');
    const updated = { ...doc, lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'update', store: 'documents', data: updated }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async deleteDocument(id: string): Promise<void> {
    const store = await this.getObjectStore('documents', 'readwrite');
    firebaseSync.addToSyncQueue({ type: 'delete', store: 'documents', data: { id } }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async logDocumentAccess(documentId: string, userId: string, action: 'view' | 'download'): Promise<void> {
    const store = await this.getObjectStore('documents', 'readwrite');
    return new Promise((resolve, reject) => {
      const getReq = store.get(documentId);
      getReq.onsuccess = () => {
        const doc = getReq.result;
        if (doc) {
          doc.lastAccessed = new Date();
          doc.lastModified = new Date();
          doc.accessLog.push({ userId, timestamp: new Date(), action });
          firebaseSync.addToSyncQueue({ type: 'update', store: 'documents', data: doc }).catch(console.warn).finally(() => {
            const putReq = store.put(doc);
            putReq.onsuccess = () => resolve();
            putReq.onerror = () => reject(putReq.error);
          });
        } else resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // ------------------ EMPLOYEES ------------------
  async createEmployee(e: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> {
    const store = await this.getObjectStore('employees', 'readwrite');
    const newEmp: Employee = { ...e, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'create', store: 'employees', data: newEmp }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.add(newEmp);
      req.onsuccess = () => resolve(newEmp);
      req.onerror = () => reject(req.error);
    });
  }
  async getAllEmployees(): Promise<Employee[]> {
    const store = await this.getObjectStore('employees');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async updateEmployee(e: Employee): Promise<void> {
    const store = await this.getObjectStore('employees', 'readwrite');
    const updated = { ...e, updatedAt: new Date(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'update', store: 'employees', data: updated }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async deleteEmployee(id: string): Promise<void> {
    const store = await this.getObjectStore('employees', 'readwrite');
    firebaseSync.addToSyncQueue({ type: 'delete', store: 'employees', data: { id } }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async getEmployeeById(id: string): Promise<Employee | null> {
    const store = await this.getObjectStore('employees');
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ ATTENDANCE ------------------
  async getAllAttendance(): Promise<Attendance[]> {
    const store = await this.getObjectStore('attendance');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async markAttendance(r: Omit<Attendance, 'id'>): Promise<Attendance> {
    const store = await this.getObjectStore('attendance', 'readwrite');
    const newRec: Attendance = { ...r, id: crypto.randomUUID(), lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'create', store: 'attendance', data: newRec }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.add(newRec);
      req.onsuccess = () => resolve(newRec);
      req.onerror = () => reject(req.error);
    });
  }
  async getAttendanceByEmployee(employeeId: string): Promise<Attendance[]> {
    const store = await this.getObjectStore('attendance');
    const idx = store.index('employeeId');
    return new Promise((resolve, reject) => {
      const req = idx.getAll(employeeId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async updateAttendance(r: Attendance): Promise<void> {
    const store = await this.getObjectStore('attendance', 'readwrite');
    const updated = { ...r, lastModified: new Date() };
    firebaseSync.addToSyncQueue({ type: 'update', store: 'attendance', data: updated }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async deleteAttendance(id: string): Promise<void> {
    const store = await this.getObjectStore('attendance', 'readwrite');
    firebaseSync.addToSyncQueue({ type: 'delete', store: 'attendance', data: { id } }).catch(console.warn);
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async getAttendanceByDate(date: string): Promise<Attendance[]> {
    const store = await this.getObjectStore('attendance');
    const idx = store.index('date');
    return new Promise((resolve, reject) => {
      const req = idx.getAll(date);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // ------------------ BACKUP / RESTORE / SYNC ------------------
  async exportData(): Promise<string> {
    const [u, c, r, e, a, n, d] = await Promise.all([
      this.getAllUsers(),
      this.getAllClients(),
      this.getAllReceipts(),
      this.getAllExpenses(),
      this.getAllActivities(),
      this.getAllNotifications(),
      this.getAllDocuments().catch(() => []),
    ]);
    return JSON.stringify(
      {
        users: u,
        clients: c,
        receipts: r,
        expenses: e,
        activities: a,
        notifications: n,
        documents: d,
        exportDate: new Date().toISOString(),
        version: this.dbVersion,
        appName: 'Arkive',
        deviceId: this.getDeviceId(),
      },
      null,
      2
    );
  }
  private getDeviceId(): string {
    let id = localStorage.getItem('arkive-device-id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('arkive-device-id', id);
    }
    return id;
  }
  async getLastSyncTime(): Promise<Date | null> {
    const store = await this.getObjectStore('sync_metadata');
    return new Promise((resolve, reject) => {
      const req = store.get('last_sync');
      req.onsuccess = () => resolve(req.result ? new Date(req.result.timestamp) : null);
      req.onerror = () => reject(req.error);
    });
  }
  async updateLastSyncTime(): Promise<void> {
    const store = await this.getObjectStore('sync_metadata', 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.put({ id: 'last_sync', timestamp: new Date(), deviceId: this.getDeviceId() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
  async importData(json: string): Promise<void> {
    const data = JSON.parse(json);
    const stores = ['users', 'clients', 'receipts', 'expenses', 'activities', 'notifications', 'documents', 'employees', 'attendance'];
    for (const s of stores) await this.clearStore(s);
    const importStore = async (name: string, items: any[]) => {
      const store = await this.getObjectStore(name, 'readwrite');
      items.forEach((item) => store.add(item));
    };
    await Promise.all([
      importStore('users', data.users || []),
      importStore('clients', data.clients || []),
      importStore('receipts', data.receipts || []),
      importStore('expenses', data.expenses || []),
      importStore('activities', data.activities || []),
      importStore('notifications', data.notifications || []),
      importStore('documents', data.documents || []),
      importStore('employees', data.employees || []),
      importStore('attendance', data.attendance || []),
    ]);
  }
  async syncFromFirebase(): Promise<void> {
    const [u, c, r, e, a, n, d, emp, att] = await Promise.all([
      firebaseSync.getStoreFromFirebase('users'),
      firebaseSync.getStoreFromFirebase('clients'),
      firebaseSync.getStoreFromFirebase('receipts'),
      firebaseSync.getStoreFromFirebase('expenses'),
      firebaseSync.getStoreFromFirebase('activities'),
      firebaseSync.getStoreFromFirebase('notifications'),
      firebaseSync.getStoreFromFirebase('documents'),
      firebaseSync.getStoreFromFirebase('employees'),
      firebaseSync.getStoreFromFirebase('attendance'),
    ]);
    const stores = ['users', 'clients', 'receipts', 'expenses', 'activities', 'notifications', 'documents', 'employees', 'attendance'];
    for (const s of stores) await this.clearStore(s);
    const imp = async (name: string, items: any[]) => {
      const store = await this.getObjectStore(name, 'readwrite');
      await Promise.all(items.map((i) => store.add(i)));
    };
    await Promise.all([
      imp('users', u),
      imp('clients', c),
      imp('receipts', r),
      imp('expenses', e),
      imp('activities', a),
      imp('notifications', n),
      imp('documents', d),
      imp('employees', emp),
      imp('attendance', att),
    ]);
  }
  async getSyncStatus() {
    return firebaseSync.getSyncStatus();
  }

  async clearStore(storeName: string): Promise<void> {
    const store = await this.getObjectStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

export const db = new DatabaseService();