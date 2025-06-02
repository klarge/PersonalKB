import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { offlineStorageMobile, type EntryData } from '@/lib/offline-storage-mobile';
import { useOfflineSync } from './useOfflineSync';

// Hook to automatically cache all user entries when online
export function useOfflineCache() {
  const { isOnline } = useOfflineSync();

  // Fetch all entries when online
  const { data: allEntries } = useQuery<EntryData[]>({
    queryKey: ['/api/entries', 'all-for-cache'],
    enabled: isOnline,
    staleTime: 2 * 60 * 1000, // 2 minutes
    queryFn: async () => {
      // Fetch all entries with a high limit to get everything
      const response = await fetch('/api/entries?limit=1000');
      if (!response.ok) throw new Error('Failed to fetch entries');
      return response.json();
    }
  });

  // Cache entries whenever we get fresh data
  useEffect(() => {
    if (isOnline && allEntries && allEntries.length > 0) {
      cacheAllEntries(allEntries);
    }
  }, [isOnline, allEntries]);

  const cacheAllEntries = async (entries: EntryData[]) => {
    try {
      console.log(`Caching ${entries.length} entries for offline access...`);
      await offlineStorageMobile.cacheServerEntries(entries);
      console.log('All entries cached successfully');
    } catch (error) {
      console.error('Error caching all entries:', error);
    }
  };

  return {
    isCaching: !!allEntries && isOnline,
    cachedEntriesCount: allEntries?.length || 0
  };
}