import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unifiedStorage } from '@/lib/unified-storage';

const isAndroid = () => {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent) || window.location.href.includes('capacitor://');
};

export function useUnifiedSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const queryClient = useQueryClient();
  
  const androidOfflineEnabled = isAndroid();

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      console.log('🔄 Device came online');
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log('🔄 Device went offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending items count
  const checkPendingItems = async () => {
    if (!androidOfflineEnabled) return;
    
    try {
      const stats = await unifiedStorage.getSyncStats();
      setPendingCount(stats.unsyncedCount);
      console.log(`🔄 Pending sync items: ${stats.unsyncedCount}`);
    } catch (error) {
      console.error('🔄 Error checking pending items:', error);
    }
  };

  // Check pending items periodically
  useEffect(() => {
    if (androidOfflineEnabled) {
      checkPendingItems();
      const interval = setInterval(checkPendingItems, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [androidOfflineEnabled]);

  // Auto-sync when coming online
  useEffect(() => {
    if (androidOfflineEnabled && isOnline && pendingCount > 0) {
      console.log('🔄 Auto-syncing on connection restore');
      setTimeout(() => syncMutation.mutate(), 1000); // Small delay to ensure connection is stable
    }
  }, [isOnline, pendingCount, androidOfflineEnabled]);

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!androidOfflineEnabled || !isOnline) {
        throw new Error('Sync not available');
      }

      setSyncInProgress(true);
      console.log('🔄 Starting sync process...');

      const unsyncedEntries = await unifiedStorage.getUnsyncedEntries();
      console.log(`🔄 Found ${unsyncedEntries.length} entries to sync`);

      let successCount = 0;
      let errorCount = 0;

      for (const entry of unsyncedEntries) {
        try {
          console.log(`🔄 Syncing entry: ${entry.title} (${entry.isOfflineCreated ? 'create' : 'update'})`);
          console.log(`🔄 Entry details:`, { id: entry.id, tempId: entry.tempId, needsSync: entry.needsSync });
          
          if (entry.isOfflineCreated) {
            // Create new entry on server
            console.log(`🔄 Creating new entry on server:`, {
              title: entry.title,
              content: entry.content,
              type: entry.type,
              date: entry.date,
              structuredData: entry.structuredData
            });
            
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
                structuredData: entry.structuredData
              })
            });
            
            console.log(`🔄 Server response:`, response.status, response.statusText);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error(`🔄 Server error:`, errorText);
              throw new Error(`Failed to create entry: ${response.status} ${errorText}`);
            }
            
            const serverEntry = await response.json();
            console.log(`🔄 Server entry created:`, serverEntry);
            
            await unifiedStorage.markAsSynced(entry.tempId || entry.id.toString(), serverEntry.id);
            console.log(`✓ Created entry on server: ${entry.tempId} -> ${serverEntry.id}`);
            successCount++;
            
          } else if (entry.isModifiedOffline && typeof entry.id === 'number') {
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
                structuredData: entry.structuredData
              })
            });
            
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Failed to update entry: ${response.status} ${errorText}`);
            }
            
            await unifiedStorage.markAsSynced(entry.id.toString());
            console.log(`✓ Updated entry on server: ${entry.id}`);
            successCount++;
          }
        } catch (error) {
          console.error(`✗ Failed to sync entry ${entry.id}:`, error);
          errorCount++;
        }
      }

      await unifiedStorage.updateLastSyncTimestamp();
      console.log(`🔄 Sync complete: ${successCount} success, ${errorCount} errors`);
      
      return { successCount, errorCount };
    },
    onSuccess: (result) => {
      console.log(`🔄 Sync completed successfully: ${result.successCount} synced, ${result.errorCount} errors`);
      checkPendingItems();
      queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
    },
    onError: (error) => {
      console.error('🔄 Sync failed:', error);
    },
    onSettled: () => {
      setSyncInProgress(false);
    }
  });

  const triggerSync = () => {
    if (androidOfflineEnabled && isOnline && !syncInProgress && pendingCount > 0) {
      syncMutation.mutate();
    }
  };

  return {
    isOnline,
    pendingCount,
    syncInProgress,
    triggerSync,
    checkPendingItems
  };
}