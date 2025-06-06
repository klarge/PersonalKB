import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedStorage, type StoredEntry } from '@/lib/unified-storage';
import { useOfflineSync } from './useOfflineSync';

interface UseUnifiedEntriesOptions {
  type?: 'journal' | 'note' | 'person' | 'place' | 'thing';
  searchQuery?: string;
  limit?: number;
  offset?: number;
  enablePagination?: boolean;
}

const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent) || window.location.href.includes('capacitor://');
};

export function useUnifiedEntries(options: UseUnifiedEntriesOptions = {}) {
  const { type, searchQuery, limit = 30, offset = 0, enablePagination = false } = options;
  const { isOnline } = useOfflineSync();
  const [localEntries, setLocalEntries] = useState<StoredEntry[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(false);
  const queryClient = useQueryClient();
  
  const androidOfflineEnabled = isAndroid();
  console.log('🔧 Android offline enabled:', androidOfflineEnabled);

  // Build query key for server requests
  const isSearchQuery = searchQuery && searchQuery.trim().length > 0;
  const queryKey = isSearchQuery 
    ? ['/api/search', { q: searchQuery.trim() }]
    : type 
    ? enablePagination 
      ? ['/api/entries', { type, limit, offset }]
      : ['/api/entries', { type }]
    : enablePagination
    ? ['/api/entries', { limit, offset }]
    : ['/api/entries'];

  // Server query (only when online)
  const serverQuery = useQuery<any[]>({
    queryKey,
    enabled: isOnline && (isSearchQuery ? searchQuery.trim().length > 2 : true),
    staleTime: 10 * 60 * 1000, // 10 minutes - longer cache time
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
  });

  // Load local entries function
  const loadLocalEntries = async () => {
    setIsLoadingLocal(true);
    try {
      console.log('🔧 Loading local entries, type:', type, 'search:', searchQuery);
      
      let entries: StoredEntry[];
      
      if (searchQuery && searchQuery.trim()) {
        entries = await unifiedStorage.searchEntries(searchQuery.trim());
        console.log(`🔧 Search results: ${entries.length} entries`);
      } else {
        entries = await unifiedStorage.getEntriesByType(type);
        console.log(`🔧 Type filter results: ${entries.length} entries for type: ${type}`);
      }
      
      console.log(`🔧 Loaded ${entries.length} local entries:`, entries.map(e => ({ id: e.id, title: e.title, isOfflineCreated: e.isOfflineCreated })));
      setLocalEntries(entries);
    } catch (error) {
      console.error('🔧 Error loading local entries:', error);
      setLocalEntries([]);
    } finally {
      setIsLoadingLocal(false);
    }
  };

  // Load local entries on mount and when parameters change
  useEffect(() => {
    if (androidOfflineEnabled) {
      loadLocalEntries();
    }
  }, [type, searchQuery, androidOfflineEnabled]);

  // Cache server data when it arrives (Android only)
  useEffect(() => {
    if (androidOfflineEnabled && isOnline && serverQuery.data) {
      console.log(`🔧 Caching ${serverQuery.data.length} server entries`);
      unifiedStorage.cacheServerEntries(serverQuery.data).then(() => {
        loadLocalEntries(); // Refresh local view after caching
      });
    }
  }, [serverQuery.data, isOnline, androidOfflineEnabled]);

  // Fetch all user entries for comprehensive caching (Android only)
  const cacheAllEntries = async () => {
    if (!androidOfflineEnabled || !isOnline) return;
    
    try {
      console.log('🔧 Fetching all entries for comprehensive caching...');
      
      const entryTypes = ['journal', 'note', 'person', 'place', 'thing'];
      const allEntries: any[] = [];
      
      for (const entryType of entryTypes) {
        try {
          const response = await fetch(`/api/entries?type=${entryType}&limit=1000`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const entries = await response.json();
            allEntries.push(...entries);
          }
        } catch (error) {
          console.error(`🔧 Failed to fetch ${entryType} entries:`, error);
        }
      }
      
      // Also fetch entries without type filter
      try {
        const response = await fetch('/api/entries?limit=1000', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const generalEntries = await response.json();
          const existingIds = new Set(allEntries.map(e => e.id));
          for (const entry of generalEntries) {
            if (!existingIds.has(entry.id)) {
              allEntries.push(entry);
            }
          }
        }
      } catch (error) {
        console.error('🔧 Failed to fetch general entries:', error);
      }
      
      console.log(`🔧 Found ${allEntries.length} total entries for caching`);
      await unifiedStorage.cacheServerEntries(allEntries);
      await loadLocalEntries();
      
    } catch (error) {
      console.error('🔧 Error in comprehensive caching:', error);
    }
  };

  // Cache all entries when coming online (Android only)
  useEffect(() => {
    if (androidOfflineEnabled && isOnline) {
      cacheAllEntries();
    }
  }, [isOnline, androidOfflineEnabled]);

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (entryData: {
      title: string;
      content: string;
      type: 'journal' | 'note' | 'person' | 'place' | 'thing';
      date: string;
      structuredData?: any;
    }) => {
      console.log('🔧 Creating entry, online:', isOnline, 'android:', androidOfflineEnabled);
      
      if (isOnline && !androidOfflineEnabled) {
        // Web online: Create directly on server
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'credentials': 'include'
          },
          credentials: 'include',
          body: JSON.stringify(entryData)
        });
        
        if (!response.ok) throw new Error('Failed to create entry');
        return await response.json();
        
      } else if (androidOfflineEnabled) {
        // Android: Create entry based on online status
        if (isOnline) {
          // Online: Create directly on server (no local copy first)
          try {
            const response = await fetch('/api/entries', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'credentials': 'include'
              },
              credentials: 'include',
              body: JSON.stringify(entryData)
            });
            
            if (response.ok) {
              const serverEntry = await response.json();
              // Cache the server entry locally
              await unifiedStorage.cacheServerEntries([serverEntry]);
              await loadLocalEntries();
              console.log('🔧 Entry created on server and cached locally');
              return serverEntry;
            } else {
              throw new Error('Server creation failed');
            }
          } catch (error) {
            console.log('🔧 Server creation failed, creating offline instead');
            // Fall through to offline creation
          }
        }
        
        // Offline or server failed: Create locally only
        console.log('🔧 Creating offline entry with data:', entryData);
        
        const tempId = await unifiedStorage.createOfflineEntry({
          title: entryData.title,
          content: entryData.content,
          type: entryData.type,
          date: entryData.date,
          structuredData: entryData.structuredData || {},
          userId: 'current-user'
        });
        
        console.log('🔧 Created offline entry with tempId:', tempId);
        await loadLocalEntries();
        
        return { tempId, success: true };
      } else {
        throw new Error('Cannot create entry while offline on web platform');
      }
    },
    onSuccess: () => {
      if (isOnline && !androidOfflineEnabled) {
        queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error) => {
      console.error('🔧 Failed to create entry:', error);
    }
  });

  // Update entry mutation
  const updateEntryMutation = useMutation({
    mutationFn: async (updateData: {
      id: number | string;
      title: string;
      content: string;
      structuredData?: any;
    }) => {
      if (isOnline && !androidOfflineEnabled) {
        // Web online: Update directly on server
        const response = await fetch(`/api/entries/${updateData.id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'credentials': 'include'
          },
          credentials: 'include',
          body: JSON.stringify({
            title: updateData.title,
            content: updateData.content,
            structuredData: updateData.structuredData || {}
          })
        });
        
        if (!response.ok) throw new Error('Failed to update entry');
        return await response.json();
        
      } else if (androidOfflineEnabled) {
        // Android: Update based on online status  
        if (isOnline && typeof updateData.id === 'number') {
          // Online with server entry: Update server first
          try {
            const response = await fetch(`/api/entries/${updateData.id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'credentials': 'include'
              },
              credentials: 'include',
              body: JSON.stringify({
                title: updateData.title,
                content: updateData.content,
                structuredData: updateData.structuredData || {}
              })
            });
            
            if (response.ok) {
              const updatedEntry = await response.json();
              // Update local cache with server response
              await unifiedStorage.cacheServerEntries([updatedEntry]);
              await loadLocalEntries();
              console.log('🔧 Entry updated on server and cached locally');
              return updatedEntry;
            }
          } catch (error) {
            console.log('🔧 Server update failed, updating locally only');
          }
        }
        
        // Offline or server failed: Update locally only
        await unifiedStorage.updateEntry(updateData.id, {
          title: updateData.title,
          content: updateData.content,
          structuredData: updateData.structuredData || {}
        });
        
        await loadLocalEntries();
        console.log('🔧 Entry updated locally');
        
        return { success: true };
      } else {
        throw new Error('Cannot update entry while offline on web platform');
      }
    },
    onSuccess: () => {
      if (isOnline && !androidOfflineEnabled) {
        queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error) => {
      console.error('🔧 Failed to update entry:', error);
    }
  });

  // Get single entry by ID or special identifier
  const getEntry = async (idOrTypeDate: number | string, dateStr?: string): Promise<StoredEntry> => {
    if (androidOfflineEnabled) {
      // Android: Check local storage first
      const allEntries = await unifiedStorage.getAllEntries();
      
      if (typeof idOrTypeDate === 'number') {
        // Find by ID
        const entry = allEntries.find(e => e.id === idOrTypeDate);
        if (entry) return entry;
      } else if (typeof idOrTypeDate === 'string' && dateStr) {
        // Find by type and date (for "today" entries)
        const entry = allEntries.find(e => 
          e.type === idOrTypeDate && 
          e.date.startsWith(dateStr)
        );
        if (entry) return entry;
      }
      
      // If online, try to fetch from server
      if (isOnline && typeof idOrTypeDate === 'number') {
        try {
          const response = await fetch(`/api/entries/${idOrTypeDate}`, {
            credentials: 'include'
          });
          if (response.ok) {
            const serverEntry = await response.json();
            await unifiedStorage.cacheServerEntries([serverEntry]);
            return serverEntry;
          }
        } catch (error) {
          console.error('Failed to fetch entry from server:', error);
        }
      }
      
      throw new Error('Entry not found');
    } else {
      // Web: Fetch from server
      if (typeof idOrTypeDate === 'number') {
        const response = await fetch(`/api/entries/${idOrTypeDate}`, {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Entry not found');
        return await response.json();
      } else {
        throw new Error('Invalid entry identifier for web platform');
      }
    }
  };

  // Return appropriate data based on platform and online status
  if (!androidOfflineEnabled) {
    // Web: Use server data only
    console.log('🔧 Web mode: Using server data only');
    return {
      data: serverQuery.data || [],
      isLoading: serverQuery.isLoading,
      error: serverQuery.error,
      isOnline: isOnline,
      getEntry,
      createEntry: createEntryMutation.mutate,
      isCreating: createEntryMutation.isPending,
      updateEntry: updateEntryMutation.mutate,
      isUpdating: updateEntryMutation.isPending
    };
  } else {
    // Android: Always use local data (which includes cached server data)
    console.log(`🔧 Android mode: Using local storage with ${localEntries.length} entries`);
    return {
      data: localEntries,
      isLoading: isLoadingLocal,
      error: null,
      isOnline: isOnline,
      getEntry,
      createEntry: createEntryMutation.mutate,
      isCreating: createEntryMutation.isPending,
      updateEntry: updateEntryMutation.mutate,
      isUpdating: updateEntryMutation.isPending
    };
  }
}