import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { offlineStorageMobile, type EntryData } from '@/lib/offline-storage-mobile';
import { useOfflineSync } from './useOfflineSync';

// Hook to automatically cache all user entries when online
export function useOfflineCache() {
  const { isOnline } = useOfflineSync();

  // Check if running on Android
  const isAndroid = () => {
    if (typeof window === 'undefined') return false;
    return /Android/i.test(navigator.userAgent) || window.location.href.includes('capacitor://');
  };

  // Fetch entries for caching - all entries on Android, recent ones on web
  const { data: entriesToCache } = useQuery<EntryData[]>({
    queryKey: ['/api/entries', 'for-cache'],
    enabled: isOnline,
    staleTime: 5 * 60 * 1000, // 5 minutes
    queryFn: async () => {
      if (isAndroid()) {
        // On Android, cache ALL entries for full offline functionality
        const response = await fetch('/api/entries?limit=10000'); // High limit to get all
        if (!response.ok) throw new Error('Failed to fetch all entries');
        return response.json();
      } else {
        // On web, only cache recent entries for performance
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const response = await fetch(`/api/entries?limit=100&since=${thirtyDaysAgo.toISOString()}`);
        if (!response.ok) throw new Error('Failed to fetch recent entries');
        return response.json();
      }
    }
  });

  // Cache entries whenever we get fresh data
  useEffect(() => {
    if (isOnline && entriesToCache && entriesToCache.length > 0) {
      cacheEntries(entriesToCache);
    }
  }, [isOnline, entriesToCache]);

  const cacheEntries = async (entries: EntryData[]) => {
    try {
      const platform = isAndroid() ? 'Android' : 'web';
      console.log(`Caching ${entries.length} entries for offline access on ${platform}...`);
      await offlineStorageMobile.cacheServerEntries(entries);
      console.log(`${entries.length} entries cached successfully`);
    } catch (error) {
      console.error('Error caching entries:', error);
    }
  };

  return {
    isCaching: !!entriesToCache && isOnline,
    cachedEntriesCount: entriesToCache?.length || 0
  };
}