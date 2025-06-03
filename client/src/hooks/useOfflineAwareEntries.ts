import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { offlineStorageMobile, type OfflineEntry, type EntryData } from '@/lib/offline-storage-mobile';
import { useOfflineSync } from './useOfflineSync';

// Check if running on Android
const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent) || window.location.href.includes('capacitor://');
};

interface UseOfflineAwareEntriesOptions {
  type?: 'journal' | 'note' | 'person' | 'place' | 'thing';
  searchQuery?: string;
  limit?: number;
  offset?: number;
  enablePagination?: boolean;
}

export function useOfflineAwareEntries(options: UseOfflineAwareEntriesOptions = {}) {
  const { type, searchQuery, limit = 30, offset = 0, enablePagination = false } = options;
  const { isOnline } = useOfflineSync();
  const [offlineEntries, setOfflineEntries] = useState<EntryData[]>([]);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const queryClient = useQueryClient();
  
  // Only enable offline functionality on Android
  const androidOfflineEnabled = isAndroid();
  console.log('Android offline enabled:', androidOfflineEnabled);

  // Build query key and enabled condition based on options
  const isSearchQuery = searchQuery && searchQuery.trim().length > 0;
  
  // For pagination, include limit and offset in query key
  const queryKey = isSearchQuery 
    ? ['/api/search', { q: searchQuery.trim() }]
    : type 
    ? enablePagination 
      ? ['/api/entries', { type, limit, offset }]
      : ['/api/entries', { type }]
    : enablePagination
    ? ['/api/entries', { limit, offset }]
    : ['/api/entries'];

  // Online query
  const onlineQuery = useQuery<EntryData[]>({
    queryKey,
    enabled: isOnline && (!isSearchQuery || searchQuery.trim().length > 2),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Convert OfflineEntry to EntryData format
  const convertOfflineToEntry = (offlineEntry: OfflineEntry): EntryData => ({
    id: offlineEntry.id || 0,
    title: offlineEntry.title,
    content: offlineEntry.content,
    type: offlineEntry.type,
    date: offlineEntry.date,
    structuredData: offlineEntry.structuredData || {},
    userId: offlineEntry.userId || 'offline-user',
    createdAt: offlineEntry.createdAt || new Date(offlineEntry.timestamp).toISOString(),
    updatedAt: offlineEntry.updatedAt || new Date(offlineEntry.timestamp).toISOString()
  });

  // Load offline entries when offline or as fallback (Android only)
  useEffect(() => {
    if (androidOfflineEnabled) {
      if (!isOnline) {
        console.log('Android going offline, loading cached entries...');
        loadOfflineEntries();
      } else {
        console.log('Android online, will use server data but keeping offline cache ready');
        // Keep offline entries loaded as fallback even when online
        loadOfflineEntries();
      }
    }
  }, [isOnline, type, searchQuery, limit, offset, androidOfflineEnabled]);

  // Preload offline entries on component mount (Android only)
  useEffect(() => {
    if (androidOfflineEnabled) {
      console.log('Android app mounted, preloading offline entries for fallback');
      loadOfflineEntries();
    }
  }, [androidOfflineEnabled]);

  const cacheEntriesOffline = async (entries: EntryData[]) => {
    try {
      await offlineStorageMobile.cacheServerEntries(entries);
    } catch (error) {
      console.error('Error caching entries offline:', error);
    }
  };

  const proactivelyCacheAllEntries = async () => {
    try {
      await offlineStorageMobile.cacheAllUserEntries();
    } catch (error) {
      console.error('Error proactively caching all entries:', error);
    }
  };

  // Cache online entries and sync offline changes (Android only)
  useEffect(() => {
    if (androidOfflineEnabled && isOnline) {
      console.log('Android online: Starting proactive caching and sync');
      proactivelyCacheAllEntries();
      syncOfflineChanges();
    }
  }, [isOnline, androidOfflineEnabled]);

  const syncOfflineChanges = async () => {
    try {
      console.log('Android: Syncing offline changes to server...');
      const unsyncedEntries = await offlineStorageMobile.getUnsyncedEntries();
      console.log(`Found ${unsyncedEntries.length} unsynced entries`);
      
      for (const entry of unsyncedEntries) {
        try {
          if (entry.action === 'create') {
            // Create new entry on server
            const response = await fetch('/api/entries', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'credentials': 'include'
              },
              credentials: 'include',
              body: JSON.stringify({
                title: entry.title,
                content: entry.content,
                type: entry.type,
                date: entry.date,
                structuredData: entry.structuredData || {}
              })
            });
            
            if (response.ok) {
              const serverEntry = await response.json();
              await offlineStorageMobile.markAsSynced(entry.tempId, serverEntry.id);
              console.log('Synced new entry:', entry.title);
            }
          } else if (entry.action === 'update' && entry.id) {
            // Update existing entry on server
            const response = await fetch(`/api/entries/${entry.id}`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'credentials': 'include'
              },
              credentials: 'include',
              body: JSON.stringify({
                title: entry.title,
                content: entry.content,
                structuredData: entry.structuredData || {}
              })
            });
            
            if (response.ok) {
              await offlineStorageMobile.markAsSynced(entry.tempId);
              console.log('Synced entry update:', entry.title);
            }
          }
        } catch (error) {
          console.error('Failed to sync entry:', entry.title, error);
        }
      }
      
      // Refresh data after sync
      queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
      if (androidOfflineEnabled) {
        loadOfflineEntries();
      }
      
    } catch (error) {
      console.error('Error syncing offline changes:', error);
    }
  };

  // Create offline entry mutation
  const createOfflineEntryMutation = useMutation({
    mutationFn: async (entryData: {
      title: string;
      content: string;
      type: 'journal' | 'note' | 'person' | 'place' | 'thing';
      date: string;
      structuredData?: any;
    }) => {
      if (isOnline || !androidOfflineEnabled) {
        // If online OR on web (no offline support), create normally via API
        const response = await fetch('/api/entries', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'credentials': 'include'
          },
          credentials: 'include',
          body: JSON.stringify(entryData)
        });
        
        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Failed to create entry: ${errorData}`);
        }
        return await response.json();
      } else {
        // If offline on Android, save to offline storage
        console.log('Android offline: Saving entry to offline storage');
        const tempId = await offlineStorageMobile.saveOfflineEntry({
          title: entryData.title,
          content: entryData.content,
          type: entryData.type,
          date: entryData.date,
          structuredData: entryData.structuredData || {},
          action: 'create'
        });
        
        // Reload offline entries immediately to show new entry
        await loadOfflineEntries();
        
        // Return success indicator
        return { tempId, success: true };
      }
    },
    onSuccess: () => {
      // Refresh queries after successful creation
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
        queryClient.invalidateQueries({ queryKey });
      } else if (androidOfflineEnabled) {
        // When offline, reload offline entries to show the new entry immediately
        loadOfflineEntries();
      }
    },
    onError: (error) => {
      console.error('Failed to create entry:', error);
    }
  });

  // Update entry mutation (works offline too)
  const updateOfflineEntryMutation = useMutation({
    mutationFn: async (updateData: {
      id: number;
      title: string;
      content: string;
      structuredData?: any;
    }) => {
      if (isOnline || !androidOfflineEnabled) {
        // If online OR on web (no offline support), update normally via API
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
      } else {
        // If offline on Android, save update to offline storage
        console.log('Android offline: Saving entry update to offline storage');
        const tempId = await offlineStorageMobile.updateExistingEntry(updateData.id, {
          id: updateData.id,
          title: updateData.title,
          content: updateData.content,
          type: 'note', // This should be passed from the caller
          date: new Date().toISOString(),
          structuredData: updateData.structuredData || {},
          userId: 'offline-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Reload offline entries to show changes immediately
        await loadOfflineEntries();
        
        // Return updated entry data
        return { tempId, success: true };
      }
    },
    onSuccess: () => {
      // Refresh queries after successful update
      if (isOnline) {
        queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
        queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (error) => {
      console.error('Failed to update entry:', error);
    }
  });

  const loadOfflineEntries = async () => {
    setIsLoadingOffline(true);
    try {
      console.log('Loading offline entries, type:', type, 'searchQuery:', searchQuery);
      
      let filteredEntries: OfflineEntry[];
      
      if (searchQuery && searchQuery.trim()) {
        filteredEntries = await offlineStorageMobile.searchEntries(searchQuery);
      } else {
        filteredEntries = await offlineStorageMobile.getEntriesByType(type);
      }

      console.log('Retrieved offline entries:', filteredEntries.length, filteredEntries);

      const convertedEntries = filteredEntries.map(convertOfflineToEntry);
      console.log('Converted entries:', convertedEntries);
      
      setOfflineEntries(convertedEntries);
    } catch (error) {
      console.error('Error loading offline entries:', error);
      setOfflineEntries([]);
    } finally {
      setIsLoadingOffline(false);
    }
  };

  // Return appropriate data based on platform and online status
  if (!androidOfflineEnabled) {
    // Web browsers: Only use online data, no offline functionality
    console.log('Web browser: Using standard online-only mode');
    return {
      data: onlineQuery.data || [],
      isLoading: onlineQuery.isLoading,
      error: onlineQuery.error,
      isOnline: isOnline,
      createEntry: createOfflineEntryMutation.mutate,
      isCreating: createOfflineEntryMutation.isPending,
      updateEntry: updateOfflineEntryMutation.mutate,
      isUpdating: updateOfflineEntryMutation.isPending
    };
  } else if (isOnline) {
    // Android online: Prefer server data, fallback to cached if needed
    const dataToShow = (onlineQuery.data && onlineQuery.data.length > 0) ? onlineQuery.data : offlineEntries;
    console.log('Android online: showing', dataToShow.length, 'entries');
    
    return {
      data: dataToShow,
      isLoading: onlineQuery.isLoading && isLoadingOffline,
      error: onlineQuery.error,
      isOnline: true,
      createEntry: createOfflineEntryMutation.mutate,
      isCreating: createOfflineEntryMutation.isPending,
      updateEntry: updateOfflineEntryMutation.mutate,
      isUpdating: updateOfflineEntryMutation.isPending
    };
  } else {
    // Android offline: Show cached/offline entries
    console.log('Android offline: showing', offlineEntries.length, 'cached entries');
    
    return {
      data: offlineEntries,
      isLoading: isLoadingOffline,
      error: null,
      isOnline: false,
      createEntry: createOfflineEntryMutation.mutate,
      isCreating: createOfflineEntryMutation.isPending,
      updateEntry: updateOfflineEntryMutation.mutate,
      isUpdating: updateOfflineEntryMutation.isPending
    };
  }
}