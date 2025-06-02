import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { offlineStorageMobile, type OfflineEntry, type EntryData } from '@/lib/offline-storage-mobile';
import { useOfflineSync } from './useOfflineSync';

interface UseOfflineAwareEntriesOptions {
  type?: 'journal' | 'note' | 'person' | 'place' | 'thing';
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export function useOfflineAwareEntries(options: UseOfflineAwareEntriesOptions = {}) {
  const { type, searchQuery, limit, offset } = options;
  const { isOnline } = useOfflineSync();
  const [offlineEntries, setOfflineEntries] = useState<EntryData[]>([]);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const queryClient = useQueryClient();

  // Build query key based on options
  const queryKey = searchQuery 
    ? ['/api/search', searchQuery]
    : type 
    ? ['/api/entries', { type }]
    : ['/api/entries'];

  // Online query
  const onlineQuery = useQuery<EntryData[]>({
    queryKey,
    enabled: isOnline,
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

  // Load offline entries when offline or as fallback
  useEffect(() => {
    if (!isOnline) {
      console.log('Going offline, loading cached entries...');
      loadOfflineEntries();
    } else {
      console.log('Going online, will use server data');
    }
  }, [isOnline, type, searchQuery, limit, offset]);

  // Also load offline entries on component mount regardless of online status
  useEffect(() => {
    console.log('Component mounted, preloading offline entries for fallback');
    loadOfflineEntries();
  }, []);

  // Cache online entries for offline use
  useEffect(() => {
    if (isOnline && onlineQuery.data && onlineQuery.data.length > 0) {
      cacheEntriesOffline(onlineQuery.data);
    }
  }, [isOnline, onlineQuery.data]);

  const cacheEntriesOffline = async (entries: EntryData[]) => {
    try {
      await offlineStorageMobile.cacheServerEntries(entries);
    } catch (error) {
      console.error('Error caching entries offline:', error);
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
      if (isOnline) {
        // If online, create normally via API
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
        // If offline, save to offline storage
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
      if (isOnline) {
        // If online, update normally via API
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
        // If offline, save update to offline storage
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

  // Return appropriate data based on online status
  if (isOnline) {
    // When online, prefer server data but fallback to offline if server data is empty
    const dataToShow = (onlineQuery.data && onlineQuery.data.length > 0) ? onlineQuery.data : offlineEntries;
    console.log('Online mode: showing', dataToShow.length, 'entries');
    
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
    // When offline, always show cached/offline entries
    console.log('Offline mode: showing', offlineEntries.length, 'cached entries');
    
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