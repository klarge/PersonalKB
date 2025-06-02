import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { useOfflineSync } from './useOfflineSync';
import type { Entry } from '../../../shared/schema';

interface UseOfflineEntriesOptions {
  type?: 'journal' | 'note' | 'person' | 'place' | 'thing';
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

export function useOfflineEntries(options: UseOfflineEntriesOptions = {}) {
  const { type, searchQuery, limit, offset } = options;
  const { isOnline } = useOfflineSync();
  const [offlineEntries, setOfflineEntries] = useState<Entry[]>([]);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const queryClient = useQueryClient();

  // Build query key based on options
  const queryKey = searchQuery 
    ? ['/api/search', searchQuery]
    : type 
    ? ['/api/entries', { type }]
    : ['/api/entries'];

  // Online query
  const onlineQuery = useQuery<Entry[]>({
    queryKey,
    enabled: isOnline,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load offline entries when offline or as fallback
  useEffect(() => {
    async function loadOfflineEntries() {
      if (!isOnline) {
        setIsLoadingOffline(true);
        try {
          const stored = await offlineStorage.getOfflineEntries();
          let filteredEntries = stored.map(entry => ({
            id: entry.id || 0,
            title: entry.title,
            content: entry.content,
            type: entry.type as 'journal' | 'note' | 'person' | 'place' | 'thing',
            date: entry.date,
            structuredData: entry.structuredData || {},
            userId: 'offline-user',
            createdAt: new Date(entry.timestamp),
            updatedAt: new Date(entry.timestamp)
          })) as Entry[];

          // Filter by type if specified
          if (type) {
            filteredEntries = filteredEntries.filter(entry => entry.type === type);
          }

          // Filter by search query if specified
          if (searchQuery && searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filteredEntries = filteredEntries.filter(entry =>
              entry.title.toLowerCase().includes(query) ||
              entry.content.toLowerCase().includes(query)
            );
          }

          // Sort by date descending
          filteredEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          // Apply pagination if specified
          if (limit) {
            const start = offset || 0;
            filteredEntries = filteredEntries.slice(start, start + limit);
          }

          setOfflineEntries(filteredEntries);
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
    if (isOnline && onlineQuery.data) {
      cacheEntriesOffline(onlineQuery.data);
    }
  }, [isOnline, onlineQuery.data]);

  const cacheEntriesOffline = async (entries: Entry[]) => {
    try {
      // Clear existing synced entries to avoid duplicates
      await offlineStorage.clearSyncedEntries();
      
      // Save each entry for offline access
      for (const entry of entries) {
        await offlineStorage.saveOfflineEntry({
          id: entry.id,
          title: entry.title,
          content: entry.content,
          type: entry.type,
          date: entry.date,
          structuredData: entry.structuredData,
          action: 'create'
        });
        
        // Mark as synced since it came from server
        const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await offlineStorage.markAsSynced(tempId, entry.id);
      }
    } catch (error) {
      console.error('Error caching entries offline:', error);
    }
  };

  // Return appropriate data based on online status
  if (isOnline) {
    return {
      data: onlineQuery.data || [],
      isLoading: onlineQuery.isLoading,
      error: onlineQuery.error,
      isOnline: true
    };
  } else {
    return {
      data: offlineEntries,
      isLoading: isLoadingOffline,
      error: null,
      isOnline: false
    };
  }
}