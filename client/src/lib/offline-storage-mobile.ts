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

const isMobile = () => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

const getMobileStorage = async (): Promise<MobileStorage> => {
  if (isMobile()) {
    console.log('✓ Using Capacitor Preferences for Android storage');
    const { Preferences } = await import('@capacitor/preferences');
    return {
      setItem: async (key: string, value: string) => {
        try {
          await Preferences.set({ key, value });
          console.log(`✓ Saved to Capacitor: ${key}`);
        } catch (error) {
          console.error(`✗ Failed to save to Capacitor: ${key}`, error);
          throw error;
        }
      },
      getItem: async (key: string) => {
        try {
          const result = await Preferences.get({ key });
          console.log(`✓ Retrieved from Capacitor: ${key}`, result.value ? 'found' : 'not found');
          return result.value;
        } catch (error) {
          console.error(`✗ Failed to get from Capacitor: ${key}`, error);
          return null;
        }
      },
      removeItem: async (key: string) => {
        try {
          await Preferences.remove({ key });
          console.log(`✓ Removed from Capacitor: ${key}`);
        } catch (error) {
          console.error(`✗ Failed to remove from Capacitor: ${key}`, error);
        }
      },
      keys: async () => {
        try {
          const result = await Preferences.keys();
          const filteredKeys = result.keys.filter(key => 
            key.startsWith('offline_entry_') || key.startsWith('cached_entry_')
          );
          console.log(`✓ Found ${filteredKeys.length} offline storage keys in Capacitor`);
          return filteredKeys;
        } catch (error) {
          console.error('✗ Failed to get Capacitor keys', error);
          return [];
        }
      },
    };
  } else {
    // Fallback to localStorage for web with enhanced debugging
    console.log('Using localStorage for offline storage (web)');
    return {
      setItem: async (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
          console.log(`✓ Saved to localStorage: ${key}`);
        } catch (error) {
          console.error(`✗ Failed to save to localStorage: ${key}`, error);
          throw error;
        }
      },
      getItem: async (key: string) => {
        try {
          const value = localStorage.getItem(key);
          console.log(`✓ Retrieved from localStorage: ${key}`, value ? 'found' : 'not found');
          return value;
        } catch (error) {
          console.error(`✗ Failed to get from localStorage: ${key}`, error);
          return null;
        }
      },
      removeItem: async (key: string) => {
        try {
          localStorage.removeItem(key);
          console.log(`✓ Removed from localStorage: ${key}`);
        } catch (error) {
          console.error(`✗ Failed to remove from localStorage: ${key}`, error);
        }
      },
      keys: async () => {
        try {
          const keys = Object.keys(localStorage).filter(key => 
            key.startsWith('offline_entry_') || key.startsWith('cached_entry_')
          );
          console.log(`✓ Found ${keys.length} offline storage keys in localStorage`);
          return keys;
        } catch (error) {
          console.error('✗ Failed to get localStorage keys', error);
          return [];
        }
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

    console.log('Saving offline entry:', tempId, offlineEntry);
    await storage.setItem(`${this.ENTRY_PREFIX}${tempId}`, JSON.stringify(offlineEntry));
    console.log('Offline entry saved successfully');
    return tempId;
  }

  // Cache server entries for offline access - now handles ALL user entries
  async cacheServerEntries(entries: EntryData[]): Promise<void> {
    const storage = await this.getStorage();
    
    console.log(`Caching ${entries.length} entries for offline access`);
    
    // Don't clear existing cached entries, just update/add new ones
    // This allows us to build up a comprehensive offline cache
    
    // Save all entries to cache
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
    
    console.log(`Successfully cached ${entries.length} entries`);
  }

  // Cache all user entries proactively (fetch all from server)
  async cacheAllUserEntries(): Promise<void> {
    try {
      console.log('Proactively fetching and caching all user entries...');
      
      // Fetch all entry types from server
      const entryTypes = ['journal', 'note', 'person', 'place', 'thing'];
      const allEntries: EntryData[] = [];
      
      for (const type of entryTypes) {
        const response = await fetch(`/api/entries?type=${type}&limit=1000`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const entries = await response.json();
          allEntries.push(...entries);
        }
      }
      
      // Also fetch entries without type filter to catch any others
      const generalResponse = await fetch('/api/entries?limit=1000', {
        credentials: 'include'
      });
      
      if (generalResponse.ok) {
        const generalEntries = await generalResponse.json();
        // Merge and deduplicate
        const existingIds = new Set(allEntries.map(e => e.id));
        for (const entry of generalEntries) {
          if (!existingIds.has(entry.id)) {
            allEntries.push(entry);
          }
        }
      }
      
      console.log(`Found ${allEntries.length} total entries to cache`);
      await this.cacheServerEntries(allEntries);
      
    } catch (error) {
      console.error('Failed to proactively cache all entries:', error);
    }
  }

  // Get all offline entries (both unsynced and cached)
  async getAllOfflineEntries(): Promise<OfflineEntry[]> {
    console.log('📱 Getting all offline entries...');
    const storage = await this.getStorage();
    const keys = await storage.keys();
    console.log('📱 Found storage keys:', keys.length);
    
    const entryKeys = keys.filter(key => 
      key.startsWith(this.ENTRY_PREFIX) || key.startsWith(this.CACHED_ENTRY_PREFIX)
    );
    console.log('📱 Entry keys found:', entryKeys.length, entryKeys);

    const entries: OfflineEntry[] = [];
    const processedIds = new Set<number>();

    for (const key of entryKeys) {
      const entryData = await storage.getItem(key);
      if (entryData) {
        try {
          const entry = JSON.parse(entryData);
          console.log('📱 Processing entry:', key, entry.title || entry.tempId);
          
          // For cached entries, check if there's a newer offline update
          if (key.startsWith(this.CACHED_ENTRY_PREFIX) && entry.id) {
            const updateKeys = keys.filter(k => 
              k.startsWith(this.ENTRY_PREFIX) && 
              k.includes(`update_${entry.id}_`)
            );
            
            // If there are updates for this entry, use the most recent one
            if (updateKeys.length > 0) {
              const latestUpdateKey = updateKeys.sort().pop();
              if (latestUpdateKey) {
                const updateData = await storage.getItem(latestUpdateKey);
                if (updateData) {
                  const updateEntry = JSON.parse(updateData);
                  // Merge the update with the cached entry
                  const mergedEntry = {
                    ...entry,
                    ...updateEntry,
                    timestamp: updateEntry.timestamp
                  };
                  entries.push(mergedEntry);
                  processedIds.add(entry.id);
                  console.log('📱 Added updated cached entry:', mergedEntry.title);
                  continue;
                }
              }
            }
            
            // Always add cached entries if no updates exist
            if (!processedIds.has(entry.id)) {
              entries.push(entry);
              processedIds.add(entry.id);
              console.log('📱 Added cached entry:', entry.title);
            }
          } else if (key.startsWith(this.ENTRY_PREFIX)) {
            // For offline entries (new creations or updates)
            if (!entry.id || !processedIds.has(entry.id)) {
              entries.push(entry);
              if (entry.id) processedIds.add(entry.id);
              console.log('📱 Added offline entry:', entry.title);
            }
          }
        } catch (error) {
          console.error('📱 Failed to parse offline entry:', key, error);
        }
      }
    }

    console.log('📱 Total entries retrieved:', entries.length);
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
    console.log('Getting entries by type:', type);
    const allEntries = await this.getAllOfflineEntries();
    console.log('All offline entries found:', allEntries.length, allEntries);
    
    const filteredEntries = type ? allEntries.filter(entry => entry.type === type) : allEntries;
    console.log('Filtered entries for type', type, ':', filteredEntries.length, filteredEntries);
    
    return filteredEntries;
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

  // Mark entry as synced and handle ID reconciliation
  async markAsSynced(tempId: string, serverId?: number): Promise<void> {
    const storage = await this.getStorage();
    const entryKey = `${this.ENTRY_PREFIX}${tempId}`;
    const entryData = await storage.getItem(entryKey);
    
    if (entryData) {
      try {
        const entry = JSON.parse(entryData);
        console.log(`📱 Marking entry as synced: ${tempId} -> ${serverId}`);
        
        entry.synced = true;
        
        if (serverId && entry.action === 'create') {
          // For new entries, replace temp ID with server ID
          entry.id = serverId;
          
          // Remove the old offline entry
          await storage.removeItem(entryKey);
          
          // Create a cached version with the server ID
          const cachedKey = `${this.CACHED_ENTRY_PREFIX}${serverId}`;
          await storage.setItem(cachedKey, JSON.stringify({
            ...entry,
            tempId: `cached_${serverId}`,
            synced: true,
            timestamp: Date.now(),
            action: 'create'
          }));
          
          console.log(`📱 Created cached entry with server ID: ${serverId}`);
          
          // Update any references to this entry in other entries
          await this.updateEntryReferences(tempId, serverId);
        } else {
          // For updates, just mark as synced
          await storage.setItem(entryKey, JSON.stringify(entry));
        }
        
      } catch (error) {
        console.error('📱 Failed to mark entry as synced:', error);
      }
    }
  }

  // Update references to an entry when its ID changes
  private async updateEntryReferences(oldTempId: string, newServerId: number): Promise<void> {
    try {
      const allEntries = await this.getAllOfflineEntries();
      
      for (const entry of allEntries) {
        let needsUpdate = false;
        let updatedContent = entry.content;
        
        // Update hashtag references in content
        const oldRef = `#[[${oldTempId}]]`;
        const newRef = `#[[${newServerId}]]`;
        
        if (updatedContent.includes(oldRef)) {
          updatedContent = updatedContent.replace(new RegExp(oldRef, 'g'), newRef);
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          const storage = await this.getStorage();
          const key = entry.synced ? 
            `${this.CACHED_ENTRY_PREFIX}${entry.id}` : 
            `${this.ENTRY_PREFIX}${entry.tempId}`;
          
          await storage.setItem(key, JSON.stringify({
            ...entry,
            content: updatedContent,
            timestamp: Date.now()
          }));
          
          console.log(`📱 Updated references in entry: ${entry.title}`);
        }
      }
    } catch (error) {
      console.error('📱 Failed to update entry references:', error);
    }
  }

  // Update offline entry (for unsynced entries)
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

  // Update existing entry (creates an offline update record)
  async updateExistingEntry(entryId: number, updates: Partial<EntryData>): Promise<string> {
    const storage = await this.getStorage();
    
    // Create a new offline entry for the update
    const tempId = `update_${entryId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const offlineUpdate: OfflineEntry = {
      id: entryId,
      tempId,
      title: updates.title || '',
      content: updates.content || '',
      type: updates.type || 'note',
      date: updates.date || new Date().toISOString(),
      structuredData: updates.structuredData || {},
      userId: updates.userId || 'offline-user',
      createdAt: updates.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false,
      action: 'update',
      timestamp: Date.now()
    };

    await storage.setItem(`${this.ENTRY_PREFIX}${tempId}`, JSON.stringify(offlineUpdate));
    
    // Also update the cached entry if it exists
    const cachedKey = `${this.CACHED_ENTRY_PREFIX}${entryId}`;
    const cachedData = await storage.getItem(cachedKey);
    if (cachedData) {
      try {
        const cachedEntry = JSON.parse(cachedData);
        const updatedCached = { ...cachedEntry, ...updates, updatedAt: new Date().toISOString() };
        await storage.setItem(cachedKey, JSON.stringify(updatedCached));
      } catch (error) {
        console.error('Failed to update cached entry:', error);
      }
    }

    return tempId;
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