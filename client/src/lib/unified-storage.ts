import { Capacitor } from '@capacitor/core';

export interface StoredEntry {
  id: number | string; // Server ID or temp ID
  tempId?: string; // For offline-created entries
  title: string;
  content: string;
  type: 'journal' | 'note' | 'person' | 'place' | 'thing';
  date: string;
  structuredData: any;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // Offline tracking
  isOfflineCreated?: boolean;
  isModifiedOffline?: boolean;
  lastSyncedAt?: string;
  needsSync?: boolean;
}

interface StorageAdapter {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

class UnifiedStorage {
  private storage: StorageAdapter | null = null;
  private readonly ENTRIES_KEY = 'unified_entries';
  private readonly SYNC_QUEUE_KEY = 'sync_queue';
  private readonly LAST_SYNC_KEY = 'last_sync_timestamp';

  private async getStorage(): Promise<StorageAdapter> {
    if (this.storage) return this.storage;

    const isMobile = () => {
      try {
        return Capacitor.isNativePlatform();
      } catch {
        return false;
      }
    };

    if (isMobile()) {
      console.log('📱 Using Capacitor Preferences for Android storage');
      const { Preferences } = await import('@capacitor/preferences');
      this.storage = {
        setItem: async (key: string, value: string) => {
          await Preferences.set({ key, value });
          console.log(`✓ Saved to Android storage: ${key}`);
        },
        getItem: async (key: string) => {
          const result = await Preferences.get({ key });
          console.log(`✓ Retrieved from Android storage: ${key}, found: ${!!result.value}`);
          return result.value;
        },
        removeItem: async (key: string) => {
          await Preferences.remove({ key });
          console.log(`✓ Removed from Android storage: ${key}`);
        },
        keys: async () => {
          const result = await Preferences.keys();
          console.log(`✓ Found ${result.keys.length} keys in Android storage`);
          return result.keys;
        },
        clear: async () => {
          await Preferences.clear();
          console.log('✓ Cleared Android storage');
        }
      };
    } else {
      console.log('🌐 Using localStorage for web storage');
      this.storage = {
        setItem: async (key: string, value: string) => {
          localStorage.setItem(key, value);
          console.log(`✓ Saved to localStorage: ${key}`);
        },
        getItem: async (key: string) => {
          const value = localStorage.getItem(key);
          console.log(`✓ Retrieved from localStorage: ${key}, found: ${!!value}`);
          return value;
        },
        removeItem: async (key: string) => {
          localStorage.removeItem(key);
          console.log(`✓ Removed from localStorage: ${key}`);
        },
        keys: async () => {
          const keys = Object.keys(localStorage);
          console.log(`✓ Found ${keys.length} keys in localStorage`);
          return keys;
        },
        clear: async () => {
          localStorage.clear();
          console.log('✓ Cleared localStorage');
        }
      };
    }

    return this.storage;
  }

  // Get all entries from local storage
  async getAllEntries(): Promise<StoredEntry[]> {
    try {
      const storage = await this.getStorage();
      const entriesData = await storage.getItem(this.ENTRIES_KEY);
      
      if (!entriesData) {
        console.log('📱 No entries found in storage, returning empty array');
        return [];
      }

      const entries = JSON.parse(entriesData) as StoredEntry[];
      console.log(`📱 Retrieved ${entries.length} entries from storage`);
      return entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('📱 Error retrieving entries:', error);
      return [];
    }
  }

  // Save all entries to local storage
  async saveAllEntries(entries: StoredEntry[]): Promise<void> {
    try {
      const storage = await this.getStorage();
      await storage.setItem(this.ENTRIES_KEY, JSON.stringify(entries));
      console.log(`📱 Saved ${entries.length} entries to storage`);
    } catch (error) {
      console.error('📱 Error saving entries:', error);
    }
  }

  // Cache server entries (replace existing cache)
  async cacheServerEntries(serverEntries: any[]): Promise<void> {
    console.log(`📱 Caching ${serverEntries.length} server entries`);
    
    const existingEntries = await this.getAllEntries();
    const serverIds = new Set(serverEntries.map(e => e.id));
    
    // Keep offline-created entries and entries modified offline
    const offlineEntries = existingEntries.filter(entry => 
      entry.isOfflineCreated || entry.isModifiedOffline || !serverIds.has(entry.id)
    );
    
    // Convert server entries to StoredEntry format
    const cachedEntries: StoredEntry[] = serverEntries.map(entry => ({
      id: entry.id,
      title: entry.title,
      content: entry.content,
      type: entry.type,
      date: entry.date,
      structuredData: entry.structuredData || {},
      userId: entry.userId,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      lastSyncedAt: new Date().toISOString(),
      needsSync: false
    }));
    
    // Merge cached server entries with offline entries
    const allEntries = [...cachedEntries, ...offlineEntries];
    
    await this.saveAllEntries(allEntries);
    console.log(`📱 Cached ${cachedEntries.length} server entries, kept ${offlineEntries.length} offline entries`);
  }

  // Create a new offline entry
  async createOfflineEntry(entryData: Omit<StoredEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const newEntry: StoredEntry = {
      id: tempId,
      tempId,
      ...entryData,
      createdAt: now,
      updatedAt: now,
      isOfflineCreated: true,
      needsSync: true
    };
    
    const entries = await this.getAllEntries();
    entries.unshift(newEntry);
    await this.saveAllEntries(entries);
    
    console.log(`📱 Created offline entry: ${tempId}`);
    return tempId;
  }

  // Update an existing entry
  async updateEntry(entryId: number | string, updates: Partial<StoredEntry>): Promise<void> {
    const entries = await this.getAllEntries();
    const entryIndex = entries.findIndex(e => e.id === entryId);
    
    if (entryIndex === -1) {
      throw new Error(`Entry not found: ${entryId}`);
    }
    
    const entry = entries[entryIndex];
    const updatedEntry: StoredEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date().toISOString(),
      isModifiedOffline: !entry.isOfflineCreated, // Mark as modified if it's a server entry
      needsSync: true
    };
    
    entries[entryIndex] = updatedEntry;
    await this.saveAllEntries(entries);
    
    console.log(`📱 Updated entry: ${entryId}`);
  }

  // Delete an entry
  async deleteEntry(entryId: number | string): Promise<void> {
    const entries = await this.getAllEntries();
    const filteredEntries = entries.filter(e => e.id !== entryId);
    await this.saveAllEntries(filteredEntries);
    
    console.log(`📱 Deleted entry: ${entryId}`);
  }

  // Get entries that need syncing
  async getUnsyncedEntries(): Promise<StoredEntry[]> {
    const entries = await this.getAllEntries();
    return entries.filter(entry => entry.needsSync);
  }

  // Mark entry as synced and update with server ID
  async markAsSynced(tempId: string, serverId?: number): Promise<void> {
    const entries = await this.getAllEntries();
    const entryIndex = entries.findIndex(e => e.id === tempId || e.tempId === tempId);
    
    if (entryIndex === -1) {
      console.warn(`📱 Entry not found for syncing: ${tempId}`);
      return;
    }
    
    const entry = entries[entryIndex];
    
    if (serverId && entry.isOfflineCreated) {
      // Replace temp ID with server ID for newly created entries
      entry.id = serverId;
      entry.isOfflineCreated = false;
    }
    
    entry.needsSync = false;
    entry.isModifiedOffline = false;
    entry.lastSyncedAt = new Date().toISOString();
    
    entries[entryIndex] = entry;
    await this.saveAllEntries(entries);
    
    console.log(`📱 Marked as synced: ${tempId} -> ${serverId || 'same ID'}`);
  }

  // Filter entries by type
  async getEntriesByType(type?: 'journal' | 'note' | 'person' | 'place' | 'thing'): Promise<StoredEntry[]> {
    const entries = await this.getAllEntries();
    return type ? entries.filter(entry => entry.type === type) : entries;
  }

  // Search entries
  async searchEntries(query: string): Promise<StoredEntry[]> {
    const entries = await this.getAllEntries();
    const lowercaseQuery = query.toLowerCase();
    
    return entries.filter(entry =>
      entry.title.toLowerCase().includes(lowercaseQuery) ||
      entry.content.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get sync statistics
  async getSyncStats(): Promise<{ totalEntries: number; unsyncedCount: number; lastSync?: string }> {
    const entries = await this.getAllEntries();
    const unsyncedEntries = entries.filter(entry => entry.needsSync);
    
    const storage = await this.getStorage();
    const lastSync = await storage.getItem(this.LAST_SYNC_KEY);
    
    return {
      totalEntries: entries.length,
      unsyncedCount: unsyncedEntries.length,
      lastSync: lastSync || undefined
    };
  }

  // Update last sync timestamp
  async updateLastSyncTimestamp(): Promise<void> {
    const storage = await this.getStorage();
    await storage.setItem(this.LAST_SYNC_KEY, new Date().toISOString());
  }

  // Clear all data (for debugging)
  async clearAll(): Promise<void> {
    const storage = await this.getStorage();
    await storage.clear();
    console.log('📱 Cleared all storage data');
  }
}

export const unifiedStorage = new UnifiedStorage();