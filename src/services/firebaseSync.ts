import { ref, set, get, remove, push, onValue, off } from 'firebase/database';
import { rtdb } from '../firebase';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  timestamp: Date;
  deviceId: string;
}

class FirebaseSyncService {
  private deviceId: string;
  private isOnline = navigator.onLine;
  private syncQueue: SyncOperation[] = [];
  private listeners: { [key: string]: any } = {};

  constructor() {
    this.deviceId = this.getDeviceId();
    
    // Monitor online status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Load sync queue from localStorage
    this.loadSyncQueue();
  }

  private getDeviceId(): string {
    let deviceId = localStorage.getItem('arkive-device-id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('arkive-device-id', deviceId);
    }
    return deviceId;
  }

  private loadSyncQueue(): void {
    const savedQueue = localStorage.getItem('arkive-sync-queue');
    if (savedQueue) {
      try {
        this.syncQueue = JSON.parse(savedQueue);
      } catch (error) {
        console.error('Error loading sync queue:', error);
        this.syncQueue = [];
      }
    }
  }

  private saveSyncQueue(): void {
    localStorage.setItem('arkive-sync-queue', JSON.stringify(this.syncQueue));
  }

  async addToSyncQueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'deviceId'>): Promise<void> {
    const syncOp: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      deviceId: this.deviceId
    };

    this.syncQueue.push(syncOp);
    this.saveSyncQueue();

    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const queue = [...this.syncQueue];
    this.syncQueue = [];

    for (const operation of queue) {
      try {
        await this.syncToFirebase(operation);
      } catch (error) {
        console.error('Sync operation failed:', error);
        // Re-add failed operations to queue
        this.syncQueue.push(operation);
      }
    }

    this.saveSyncQueue();
  }

  private async syncToFirebase(operation: SyncOperation): Promise<void> {
    const path = `${operation.store}/${operation.data.id}`;
    const dataRef = ref(rtdb, path);

    switch (operation.type) {
      case 'create':
      case 'update':
        await set(dataRef, {
          ...operation.data,
          lastModified: new Date(operation.timestamp).toISOString(),
          syncedBy: this.deviceId
        });
        break;
      case 'delete':
        await remove(dataRef);
        break;
    }
  }

  // Sync specific store to Firebase
  async syncStoreToFirebase(storeName: string, data: any[]): Promise<void> {
    if (!this.isOnline) return;

    try {
      const storeRef = ref(rtdb, storeName);
      const storeData: { [key: string]: any } = {};
      
      data.forEach(item => {
        storeData[item.id] = {
          ...item,
          lastModified: new Date().toISOString(),
          syncedBy: this.deviceId
        };
      });

      await set(storeRef, storeData);
    } catch (error) {
      console.error(`Error syncing ${storeName} to Firebase:`, error);
    }
  }

  // Get all data from Firebase for a store
  async getStoreFromFirebase(storeName: string): Promise<any[]> {
    if (!this.isOnline) return [];

    try {
      const storeRef = ref(rtdb, storeName);
      const snapshot = await get(storeRef);
      const data = snapshot.val();
      
      if (!data) return [];
      
      return Object.values(data).map((item: any) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
        date: item.date ? new Date(item.date) : undefined,
        timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
        uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : undefined,
        lastAccessed: item.lastAccessed ? new Date(item.lastAccessed) : undefined,
        lastLogin: item.lastLogin ? new Date(item.lastLogin) : undefined
      }));
    } catch (error) {
      console.error(`Error getting ${storeName} from Firebase:`, error);
      return [];
    }
  }

  // Set up real-time listener for a store
  setupRealtimeListener(storeName: string, callback: (data: any[]) => void): void {
    if (!this.isOnline) return;

    const storeRef = ref(rtdb, storeName);
    
    const listener = onValue(storeRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const items = Object.values(data).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
          lastModified: item.lastModified ? new Date(item.lastModified) : undefined,
          date: item.date ? new Date(item.date) : undefined,
          timestamp: item.timestamp ? new Date(item.timestamp) : undefined,
          uploadedAt: item.uploadedAt ? new Date(item.uploadedAt) : undefined,
          lastAccessed: item.lastAccessed ? new Date(item.lastAccessed) : undefined,
          lastLogin: item.lastLogin ? new Date(item.lastLogin) : undefined,
          joinDate: item.joinDate ? new Date(item.joinDate) : undefined
        }));
        callback(items);
      } else {
        callback([]);
      }
    });

    this.listeners[storeName] = listener;
  }

  // Remove real-time listener
  removeRealtimeListener(storeName: string): void {
    if (this.listeners[storeName]) {
      const storeRef = ref(rtdb, storeName);
      off(storeRef, 'value', this.listeners[storeName]);
      delete this.listeners[storeName];
    }
  }

  // Full sync - merge local and remote data
  async performFullSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('Cannot sync while offline');
    }

    try {
      // Process any pending sync operations first
      await this.processSyncQueue();

      // Update last sync time
      const syncRef = ref(rtdb, `sync_metadata/${this.deviceId}`);
      await set(syncRef, {
        lastSync: new Date().toISOString(),
        deviceId: this.deviceId
      });

    } catch (error) {
      console.error('Full sync failed:', error);
      throw error;
    }
  }

  // Get sync status
  async getSyncStatus(): Promise<{ lastSync: Date | null; isOnline: boolean; queueLength: number }> {
    let lastSync: Date | null = null;

    if (this.isOnline) {
      try {
        const syncRef = ref(rtdb, `sync_metadata/${this.deviceId}`);
        const snapshot = await get(syncRef);
        const data = snapshot.val();
        if (data && data.lastSync) {
          lastSync = new Date(data.lastSync);
        }
      } catch (error) {
        console.error('Error getting sync status:', error);
      }
    }

    return {
      lastSync,
      isOnline: this.isOnline,
      queueLength: this.syncQueue.length
    };
  }

  // Cleanup
  cleanup(): void {
    Object.keys(this.listeners).forEach(storeName => {
      this.removeRealtimeListener(storeName);
    });
  }
}

export const firebaseSync = new FirebaseSyncService();