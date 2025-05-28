import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import EntryCard from "@/components/entry-card";
import type { Entry } from "@shared/schema";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const { data: results = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/search", { q: query }],
    enabled: query.length > 2,
  });

  return (
    <div className="min-h-screen flex bg-neutral">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-dark">Search</h2>
          </div>
        </header>

        {/* Search Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Search Input */}
            <div className="mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search entries, tags, or content..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-12 text-lg py-3"
                  autoFocus
                />
              </div>
              {query.length > 0 && query.length <= 2 && (
                <p className="text-sm text-secondary mt-2">
                  Type at least 3 characters to search
                </p>
              )}
            </div>

            {/* Search Results */}
            {query.length > 2 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-dark">
                    Search Results
                  </h3>
                  {!isLoading && (
                    <span className="text-sm text-secondary">
                      {results.length} {results.length === 1 ? "result" : "results"} found
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                        <div className="animate-pulse">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-dark mb-2">No results found</h4>
                    <p className="text-secondary">
                      Try different keywords or check your spelling
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((entry) => (
                      <EntryCard 
                        key={entry.id} 
                        entry={entry} 
                        searchQuery={query}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Tips */}
            {query.length === 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-dark mb-4">Search Tips</h3>
                <div className="space-y-3 text-secondary">
                  <p>• Search for specific words or phrases in your entries</p>
                  <p>• Use hashtags to find entries with specific tags (e.g., #work)</p>
                  <p>• Search is case-insensitive and searches both titles and content</p>
                  <p>• Results are sorted by most recent entries first</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
