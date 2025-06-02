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
    async function loadOfflineEntries() {
      if (!isOnline) {
        setIsLoadingOffline(true);
        try {
          let filteredEntries: OfflineEntry[];
          
          if (searchQuery && searchQuery.trim()) {
            filteredEntries = await offlineStorageMobile.searchEntries(searchQuery);
          } else {
            filteredEntries = await offlineStorageMobile.getEntriesByType(type);
          }

          // Convert to EntryData format
          const convertedEntries = filteredEntries.map(convertOfflineToEntry);

          // Apply pagination if specified
          if (limit) {
            const start = offset || 0;
            convertedEntries.splice(start + limit);
          }

          setOfflineEntries(convertedEntries);
        } catch (error) {
          console.error('Error loading offline entries:', error);
          setOfflineEntries([]);
        } finally {
          setIsLoadingOffline(false);
        }
      }
    }

    loadOfflineEntries();
  }, [isOnline, type, searchQuery, limit, offset]);

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entryData)
        });
        
        if (!response.ok) throw new Error('Failed to create entry');
        return await response.json();
      } else {
        // If offline, save to offline storage
        const tempId = await offlineStorageMobile.saveOfflineEntry({
          ...entryData,
          structuredData: entryData.structuredData || {},
          action: 'create'
        });
        
        // Return offline entry data
        return {
          id: 0,
          tempId,
          ...entryData,
          userId: 'offline-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
    },
    onSuccess: () => {
      // Refresh queries after successful creation
      queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
      
      // If offline, reload offline entries
      if (!isOnline) {
        loadOfflineEntries();
      }
    }
  });

  const loadOfflineEntries = async () => {
    setIsLoadingOffline(true);
    try {
      let filteredEntries: OfflineEntry[];
      
      if (searchQuery && searchQuery.trim()) {
        filteredEntries = await offlineStorageMobile.searchEntries(searchQuery);
      } else {
        filteredEntries = await offlineStorageMobile.getEntriesByType(type);
      }

      const convertedEntries = filteredEntries.map(convertOfflineToEntry);
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
    return {
      data: onlineQuery.data || [],
      isLoading: onlineQuery.isLoading,
      error: onlineQuery.error,
      isOnline: true,
      createEntry: createOfflineEntryMutation.mutate,
      isCreating: createOfflineEntryMutation.isPending
    };
  } else {
    return {
      data: offlineEntries,
      isLoading: isLoadingOffline,
      error: null,
      isOnline: false,
      createEntry: createOfflineEntryMutation.mutate,
      isCreating: createOfflineEntryMutation.isPending
    };
  }
}