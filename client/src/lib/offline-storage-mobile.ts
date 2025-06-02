import { Capacitor } from '@capacitor/core';

export interface OfflineEntry {
  id?: number;
  tempId: string;
  title: string;
  content: string;
  type: 'journal' | 'note' | 'person' | 'place' | 'thing';
  date: string;
  structuredData: any;
  synced: boolean;
  action: 'create' | 'update' | 'delete';
  timestamp: number;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EntryData {
  id: number;
  title: string;
  content: string;
  type: 'journal' | 'note' | 'person' | 'place' | 'thing';
  date: string;
  structuredData: any;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface MobileStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  keys(): Promise<string[]>;
}

const isMobile = () => Capacitor.isNativePlatform();

const getMobileStorage = async (): Promise<MobileStorage> => {
  if (isMobile()) {
    const { Preferences } = await import('@capacitor/preferences');
    return {
      setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value });
      },
      getItem: async (key: string) => {
        const result = await Preferences.get({ key });
        return result.value;
      },
      removeItem: async (key: string) => {
        await Preferences.remove({ key });
      },
      keys: async () => {
        const result = await Preferences.keys();
        return result.keys;
      },
    };
  } else {
    // Fallback to localStorage for web
    return {
      setItem: async (key: string, value: string) => {
        localStorage.setItem(key, value);
      },
      getItem: async (key: string) => {
        return localStorage.getItem(key);
      },
      removeItem: async (key: string) => {
        localStorage.removeItem(key);
      },
      keys: async () => {
        return Object.keys(localStorage);
      },
    };
  }
};

class OfflineStorageMobile {
  private ENTRY_PREFIX = 'offline_entry_';
  private CACHED_ENTRY_PREFIX = 'cached_entry_';
  private SYNC_QUEUE_KEY = 'sync_queue';
  private storage: MobileStorage | null = null;

  private async getStorage(): Promise<MobileStorage> {
    if (!this.storage) {
      this.storage = await getMobileStorage();
    }
    return this.storage;
  }

  // Save offline entry (unsynced)
  async saveOfflineEntry(entry: Omit<OfflineEntry, 'tempId' | 'synced' | 'timestamp'>): Promise<string> {
    const storage = await this.getStorage();
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineEntry: OfflineEntry = {
      ...entry,
      tempId,
      synced: false,
      timestamp: Date.now()
    };

    await storage.setItem(`${this.ENTRY_PREFIX}${tempId}`, JSON.stringify(offlineEntry));
    return tempId;
  }

  // Cache server entries for offline access
  async cacheServerEntries(entries: EntryData[]): Promise<void> {
    const storage = await this.getStorage();
    
    // Clear existing cached entries
    const keys = await storage.keys();
    const cachedKeys = keys.filter(key => key.startsWith(this.CACHED_ENTRY_PREFIX));
    for (const key of cachedKeys) {
      await storage.removeItem(key);
    }

    // Save new cached entries
    for (const entry of entries) {
      const cacheKey = `${this.CACHED_ENTRY_PREFIX}${entry.id}`;
      await storage.setItem(cacheKey, JSON.stringify({
        ...entry,
        synced: true,
        tempId: `cached_${entry.id}`,
        timestamp: Date.now(),
        action: 'create' as const
      }));
    }
  }

  // Get all offline entries (both unsynced and cached)
  async getAllOfflineEntries(): Promise<OfflineEntry[]> {
    const storage = await this.getStorage();
    const keys = await storage.keys();
    const entryKeys = keys.filter(key => 
      key.startsWith(this.ENTRY_PREFIX) || key.startsWith(this.CACHED_ENTRY_PREFIX)
    );

    const entries: OfflineEntry[] = [];
    for (const key of entryKeys) {
      const entryData = await storage.getItem(key);
      if (entryData) {
        try {
          entries.push(JSON.parse(entryData));
        } catch (error) {
          console.error('Failed to parse offline entry:', error);
        }
      }
    }

    return entries.sort((a, b) => b.timestamp - a.timestamp);
  }

  // Get only unsynced entries
  async getUnsyncedEntries(): Promise<OfflineEntry[]> {
    const storage = await this.getStorage();
    const keys = await storage.keys();
    const offlineKeys = keys.filter(key => key.startsWith(this.ENTRY_PREFIX));

    const unsyncedEntries: OfflineEntry[] = [];
    for (const key of offlineKeys) {
      const entryData = await storage.getItem(key);
      if (entryData) {
        try {
          const entry = JSON.parse(entryData);
          if (!entry.synced) {
            unsyncedEntries.push(entry);
          }
        } catch (error) {
          console.error('Failed to parse unsynced entry:', error);
        }
      }
    }

    return unsyncedEntries.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Filter entries by type
  async getEntriesByType(type?: 'journal' | 'note' | 'person' | 'place' | 'thing'): Promise<OfflineEntry[]> {
    const allEntries = await this.getAllOfflineEntries();
    return type ? allEntries.filter(entry => entry.type === type) : allEntries;
  }

  // Search entries
  async searchEntries(query: string): Promise<OfflineEntry[]> {
    if (!query.trim()) return [];
    
    const allEntries = await this.getAllOfflineEntries();
    const lowerQuery = query.toLowerCase();
    
    return allEntries.filter(entry =>
      entry.title.toLowerCase().includes(lowerQuery) ||
      entry.content.toLowerCase().includes(lowerQuery)
    );
  }

  // Mark entry as synced
  async markAsSynced(tempId: string, serverId?: number): Promise<void> {
    const storage = await this.getStorage();
    const entryKey = `${this.ENTRY_PREFIX}${tempId}`;
    const entryData = await storage.getItem(entryKey);
    
    if (entryData) {
      try {
        const entry = JSON.parse(entryData);
        entry.synced = true;
        if (serverId) {
          entry.id = serverId;
        }
        await storage.setItem(entryKey, JSON.stringify(entry));
      } catch (error) {
        console.error('Failed to mark entry as synced:', error);
      }
    }
  }

  // Update offline entry
  async updateOfflineEntry(tempId: string, updates: Partial<OfflineEntry>): Promise<void> {
    const storage = await this.getStorage();
    const entryKey = `${this.ENTRY_PREFIX}${tempId}`;
    const entryData = await storage.getItem(entryKey);
    
    if (entryData) {
      try {
        const entry = JSON.parse(entryData);
        const updatedEntry = { ...entry, ...updates, timestamp: Date.now() };
        await storage.setItem(entryKey, JSON.stringify(updatedEntry));
      } catch (error) {
        console.error('Failed to update offline entry:', error);
      }
    }
  }

  // Delete offline entry
  async deleteOfflineEntry(tempId: string): Promise<void> {
    const storage = await this.getStorage();
    await storage.removeItem(`${this.ENTRY_PREFIX}${tempId}`);
  }

  // Clear all offline data
  async clearAllOfflineData(): Promise<void> {
    const storage = await this.getStorage();
    const keys = await storage.keys();
    const offlineKeys = keys.filter(key => 
      key.startsWith(this.ENTRY_PREFIX) || 
      key.startsWith(this.CACHED_ENTRY_PREFIX) ||
      key === this.SYNC_QUEUE_KEY
    );

    for (const key of offlineKeys) {
      await storage.removeItem(key);
    }
  }

  // Get entry count for each type
  async getEntryCounts(): Promise<Record<string, number>> {
    const allEntries = await this.getAllOfflineEntries();
    const counts = {
      journal: 0,
      note: 0,
      person: 0,
      place: 0,
      thing: 0,
      total: allEntries.length
    };

    for (const entry of allEntries) {
      if (counts.hasOwnProperty(entry.type)) {
        counts[entry.type]++;
      }
    }

    return counts;
  }
}

export const offlineStorageMobile = new OfflineStorageMobile();