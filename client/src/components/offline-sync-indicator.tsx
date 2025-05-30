import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RotateCw, CheckCircle } from 'lucide-react';

export default function OfflineSyncIndicator() {
  const { isOnline, syncInProgress, pendingCount, triggerSync } = useOfflineSync();

  if (isOnline && pendingCount === 0) {
    return null; // Hide when online with no pending items
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingCount} pending
            </Badge>
          )}
        </div>

        {pendingCount > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {syncInProgress ? 'Syncing...' : 'Ready to sync'}
              </span>
              
              {isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={triggerSync}
                  disabled={syncInProgress}
                  className="h-6 px-2 text-xs"
                >
                  {syncInProgress ? (
                    <RotateCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  {syncInProgress ? 'Syncing' : 'Sync'}
                </Button>
              )}
            </div>
            
            {!isOnline && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Changes will sync when back online
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}