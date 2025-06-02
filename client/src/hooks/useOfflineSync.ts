import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineStorageMobile } from '@/lib/offline-storage-mobile';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const queryClient = useQueryClient();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSync();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check for pending items on load
    checkPendingItems();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingItems = async () => {
    try {
      const unsynced = await offlineStorageMobile.getUnsyncedEntries();
      setPendingCount(unsynced.length);
    } catch (error) {
      console.error('Error checking pending items:', error);
    }
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncInProgress(true);
      const unsyncedEntries = await offlineStorageMobile.getUnsyncedEntries();
      
      for (const entry of unsyncedEntries) {
        try {
          if (entry.action === 'create') {
            const response = await fetch('/api/entries', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: entry.title,
                content: entry.content,
                type: entry.type,
                date: entry.date,
                structuredData: entry.structuredData
              })
            });
            
            if (!response.ok) throw new Error('Failed to sync entry');
            const data = await response.json();
            
            // Mark as synced with server ID
            await offlineStorageMobile.markAsSynced(entry.tempId!, data.id);
          } else if (entry.action === 'update' && entry.id) {
            const response = await fetch(`/api/entries/${entry.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: entry.title,
                content: entry.content,
                structuredData: entry.structuredData
              })
            });
            
            if (!response.ok) throw new Error('Failed to update entry');
            await offlineStorageMobile.markAsSynced(entry.tempId!);
          } else if (entry.action === 'delete' && entry.id) {
            const response = await fetch(`/api/entries/${entry.id}`, {
              method: 'DELETE'
            });
            
            if (!response.ok) throw new Error('Failed to delete entry');
            await offlineStorageMobile.deleteOfflineEntry(entry.tempId!);
          }
        } catch (error) {
          console.error(`Failed to sync entry ${entry.tempId}:`, error);
          // Continue with other entries even if one fails
        }
      }
      
      return true;
    },
    onSuccess: () => {
      // Refresh all entry queries after successful sync
      queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
      checkPendingItems();
    },
    onSettled: () => {
      setSyncInProgress(false);
    }
  });

  const triggerSync = () => {
    if (isOnline && !syncInProgress) {
      syncMutation.mutate();
    }
  };

  const saveOfflineEntry = async (entryData: {
    title: string;
    content: string;
    type: string;
    date: string;
    structuredData?: any;
  }) => {
    try {
      const tempId = await offlineStorageMobile.saveOfflineEntry({
        ...entryData,
        structuredData: entryData.structuredData || {},
        action: 'create'
      });
      
      setPendingCount(prev => prev + 1);
      
      // Try to sync immediately if online
      if (isOnline) {
        triggerSync();
      }
      
      return tempId;
    } catch (error) {
      console.error('Error saving offline entry:', error);
      throw error;
    }
  };

  return {
    isOnline,
    syncInProgress,
    pendingCount,
    triggerSync,
    saveOfflineEntry,
    checkPendingItems
  };
}