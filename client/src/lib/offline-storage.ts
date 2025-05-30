// Offline storage using IndexedDB for mobile app
interface OfflineEntry {
  id?: number;
  tempId?: string;
  title: string;
  content: string;
  type: string;
  date: string;
  structuredData: any;
  synced: boolean;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
}

class OfflineStorage {
  private dbName = 'PersonalKBOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store for offline entries
        if (!db.objectStoreNames.contains('entries')) {
          const entryStore = db.createObjectStore('entries', { keyPath: 'tempId' });
          entryStore.createIndex('synced', 'synced', { unique: false });
          entryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Store for pending sync operations
        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'tempId' });
        }
      };
    });
  }

  async saveOfflineEntry(entry: Omit<OfflineEntry, 'tempId' | 'synced' | 'timestamp'> & { structuredData?: any }): Promise<string> {
    if (!this.db) await this.init();
    
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const offlineEntry: OfflineEntry = {
      ...entry,
      tempId,
      synced: false,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.add(offlineEntry);
      
      request.onsuccess = () => resolve(tempId);
      request.onerror = () => reject(request.error);
    });
  }

  async getOfflineEntries(): Promise<OfflineEntry[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readonly');
      const store = transaction.objectStore('entries');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getUnsyncedEntries(): Promise<OfflineEntry[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readonly');
      const store = transaction.objectStore('entries');
      const index = store.index('synced');
      const request = index.getAll(0); // 0 represents false for boolean index
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(tempId: string, serverId?: number): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const getRequest = store.get(tempId);
      
      getRequest.onsuccess = () => {
        const entry = getRequest.result;
        if (entry) {
          entry.synced = true;
          if (serverId) entry.id = serverId;
          
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteOfflineEntry(tempId: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const request = store.delete(tempId);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncedEntries(): Promise<void> {
    if (!this.db) await this.init();
    
    const unsyncedEntries = await this.getUnsyncedEntries();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['entries'], 'readwrite');
      const store = transaction.objectStore('entries');
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = async () => {
        // Re-add unsynced entries
        for (const entry of unsyncedEntries) {
          await new Promise<void>((res, rej) => {
            const addRequest = store.add(entry);
            addRequest.onsuccess = () => res();
            addRequest.onerror = () => rej(addRequest.error);
          });
        }
        resolve();
      };
      
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();