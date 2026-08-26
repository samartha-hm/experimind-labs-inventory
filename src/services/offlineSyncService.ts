/**
 * Experimind Labs Offline Warehouse Floor Sync Service
 * Uses IndexedDB to store pending stock counts, scans, and bin movements when offline,
 * and seamlessly synchronizes with PostgreSQL when connectivity is restored.
 */

export interface OfflineAction {
  id: string;
  type: 'INBOUND' | 'OUTBOUND' | 'RELOCATE' | 'STOCK_COUNT';
  payload: any;
  timestamp: string;
  synced: boolean;
}

const DB_NAME = 'ExperimindOfflineWarehouseDB';
const DB_VERSION = 1;
const STORE_QUEUE = 'scan_queue';
const STORE_CACHE = 'inventory_cache';

class OfflineSyncService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private listeners: ((isOnline: boolean, pendingCount: number) => void)[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notifyListeners();
        this.autoSync();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notifyListeners();
      });
    }
  }

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('IndexedDB is not supported in this environment'));
          return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_QUEUE)) {
            db.createObjectStore(STORE_QUEUE, { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(STORE_CACHE)) {
            db.createObjectStore(STORE_CACHE, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    return this.dbPromise;
  }

  public subscribe(callback: (isOnline: boolean, pendingCount: number) => void): () => void {
    this.listeners.push(callback);
    this.getPendingCount().then(count => callback(this.isOnline, count));
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private async notifyListeners() {
    const count = await this.getPendingCount();
    this.listeners.forEach(cb => cb(this.isOnline, count));
  }

  public getOnlineStatus(): boolean {
    return this.isOnline;
  }

  public async getPendingCount(): Promise<number> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_QUEUE, 'readonly');
        const store = tx.objectStore(STORE_QUEUE);
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  public async enqueueAction(type: OfflineAction['type'], payload: any): Promise<void> {
    try {
      const db = await this.getDB();
      const action: OfflineAction = {
        id: `offline_act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        payload,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        const req = store.add(action);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to enqueue offline action:', e);
    }
  }

  public async getAllPendingActions(): Promise<OfflineAction[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_QUEUE, 'readonly');
        const store = tx.objectStore(STORE_QUEUE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async clearAction(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_QUEUE, 'readwrite');
        const store = tx.objectStore(STORE_QUEUE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      this.notifyListeners();
    } catch (e) {
      console.warn('Failed to clear action:', e);
    }
  }

  public async cacheInventory(items: any[]): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_CACHE, 'readwrite');
      const store = tx.objectStore(STORE_CACHE);
      store.clear();
      for (const item of items) {
        store.put(item);
      }
    } catch (e) {
      console.warn('Failed to cache inventory offline:', e);
    }
  }

  public async getCachedInventory(): Promise<any[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CACHE, 'readonly');
        const store = tx.objectStore(STORE_CACHE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  public async autoSync(): Promise<{ syncedCount: number; errors: number }> {
    if (!this.isOnline) return { syncedCount: 0, errors: 0 };
    const pending = await this.getAllPendingActions();
    if (pending.length === 0) return { syncedCount: 0, errors: 0 };

    let syncedCount = 0;
    let errors = 0;

    for (const act of pending) {
      try {
        if (act.type === 'INBOUND' || act.type === 'OUTBOUND' || act.type === 'RELOCATE') {
          // Send adjustments to server
          const res = await fetch(`/api/v1/inventory/${act.payload.itemId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
            },
            body: JSON.stringify(act.payload.updates),
          });
          if (res.ok) {
            await this.clearAction(act.id);
            syncedCount++;
          } else {
            errors++;
          }
        }
      } catch (err) {
        errors++;
      }
    }

    this.notifyListeners();
    return { syncedCount, errors };
  }
}

export const offlineSync = new OfflineSyncService();
