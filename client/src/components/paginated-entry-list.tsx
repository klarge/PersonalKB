import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useOfflineAwareEntries } from "@/hooks/useOfflineAwareEntries";
import type { EntryData } from "@/lib/offline-storage-mobile";

interface PaginatedEntryListProps {
  type?: 'journal' | 'note' | 'person' | 'place' | 'thing';
  searchQuery?: string;
  children: (entries: EntryData[], isLoading: boolean) => React.ReactNode;
}

export default function PaginatedEntryList({ type, searchQuery, children }: PaginatedEntryListProps) {
  const [allLoadedEntries, setAllLoadedEntries] = useState<EntryData[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  
  const ENTRIES_PER_PAGE = 30;
  
  // Check if running on Android (no pagination needed there)
  const isAndroid = () => {
    if (typeof window === 'undefined') return false;
    return /Android/i.test(navigator.userAgent) || window.location.href.includes('capacitor://');
  };

  // For Android, load all entries without pagination
  const androidQuery = useOfflineAwareEntries({
    type,
    searchQuery,
    enablePagination: false
  });

  // For web, load entries with pagination
  const webQuery = useOfflineAwareEntries({
    type,
    searchQuery,
    limit: ENTRIES_PER_PAGE,
    offset: currentOffset,
    enablePagination: true
  });

  // Use Android query if on Android, otherwise use web query
  const currentQuery = isAndroid() ? androidQuery : webQuery;

  // Handle new data from paginated requests
  useEffect(() => {
    if (!isAndroid() && webQuery.data && webQuery.data.length > 0) {
      if (currentOffset === 0) {
        // First load - replace all entries
        setAllLoadedEntries(webQuery.data);
        setHasLoadedInitial(true);
      } else {
        // Subsequent loads - append new entries
        setAllLoadedEntries(prev => {
          const newEntries = webQuery.data.filter(
            newEntry => !prev.some(existingEntry => existingEntry.id === newEntry.id)
          );
          return [...prev, ...newEntries];
        });
      }
    }
  }, [webQuery.data, currentOffset]);

  // Reset when search query or type changes
  useEffect(() => {
    if (!isAndroid()) {
      setCurrentOffset(0);
      setAllLoadedEntries([]);
      setHasLoadedInitial(false);
    }
  }, [type, searchQuery]);

  const loadMore = () => {
    if (!isAndroid()) {
      setCurrentOffset(prev => prev + ENTRIES_PER_PAGE);
    }
  };

  // Determine what entries to show and loading state
  let entriesToShow: EntryData[];
  let isLoading: boolean;
  let canLoadMore: boolean;

  if (isAndroid()) {
    // On Android, show all entries from the single query
    entriesToShow = androidQuery.data || [];
    isLoading = androidQuery.isLoading;
    canLoadMore = false;
  } else {
    // On web, show accumulated entries
    entriesToShow = allLoadedEntries;
    isLoading = webQuery.isLoading && !hasLoadedInitial;
    canLoadMore = webQuery.data && webQuery.data.length === ENTRIES_PER_PAGE;
  }

  return (
    <div>
      {children(entriesToShow, isLoading)}
      
      {/* Load More button for web only */}
      {!isAndroid() && hasLoadedInitial && canLoadMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={loadMore}
            disabled={webQuery.isLoading}
            variant="outline"
            size="lg"
          >
            {webQuery.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More Entries`
            )}
          </Button>
        </div>
      )}
      
      {/* Show count info */}
      {!isAndroid() && hasLoadedInitial && (
        <div className="text-center mt-4 text-sm text-gray-500">
          Showing {entriesToShow.length} entries
          {!canLoadMore && entriesToShow.length > 0 && " (all loaded)"}
        </div>
      )}
    </div>
  );
}