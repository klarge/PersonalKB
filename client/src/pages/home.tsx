import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Download, Grid } from "lucide-react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import EntryCard from "@/components/entry-card";
import type { Entry } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

  const { data: entries = [], isLoading } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
  });

  const { data: todayEntry } = useQuery({
    queryKey: ["/api/entries/today"],
  });

  const filteredEntries = entries.filter(entry =>
    entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateTodayEntry = async () => {
    if (todayEntry) {
      window.location.href = `/entry/${todayEntry.id}`;
    } else {
      // This will trigger the creation of today's entry
      window.location.href = '/entry/today';
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-dark">Journal Entries</h2>
              <span className="text-sm text-secondary">
                {new Date().toLocaleDateString("en-US", { 
                  month: "long", 
                  year: "numeric" 
                })}
              </span>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search entries, tags, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView(view === "list" ? "grid" : "list")}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            {/* Today's Entry Card */}
            {todayEntry && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-dark">Today's Entry</h3>
                      <span className="text-sm text-secondary">
                        {new Date().toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        Active
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.href = `/entry/${todayEntry.id}`}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                  
                  {todayEntry.content ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-dark line-clamp-3">{todayEntry.content}</p>
                    </div>
                  ) : (
                    <p className="text-secondary italic">Start writing your thoughts for today...</p>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-4 mb-6">
              <Button onClick={handleCreateTodayEntry} className="bg-primary hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Today's Entry
              </Button>
            </div>

            {/* Recent Entries */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-dark">Recent Entries</h4>
              
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
              ) : filteredEntries.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-secondary">No entries found. Start writing your first entry!</p>
                </div>
              ) : (
                <div className={view === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
                  {filteredEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
