import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, BookOpen, Lightbulb, Plus, Search, LayoutGrid, List } from "lucide-react";
import QuickNoteDialog from "@/components/quick-note-dialog";
import { Link } from "wouter";
import type { Entry } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

  const { data: allEntries = [], isLoading: isLoadingAll } = useQuery<Entry[]>({
    queryKey: ["/api/entries"],
  });

  const { data: journalEntries = [], isLoading: isLoadingJournal } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { type: "journal" }],
    queryFn: () => fetch("/api/entries?type=journal").then(res => res.json()),
  });

  const { data: noteEntries = [], isLoading: isLoadingNotes } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { type: "note" }],
    queryFn: () => fetch("/api/entries?type=note").then(res => res.json()),
  });

  const { data: searchResults = [], isLoading: isSearching } = useQuery<Entry[]>({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => {
      if (!searchQuery.trim()) return [];
      return fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`).then(res => res.json());
    },
    enabled: searchQuery.trim().length > 0,
  });

  const displayEntries = searchQuery.trim() ? searchResults : allEntries;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">Knowledge Hub</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/entry/today">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  Today's Journal
                </Button>
              </Link>
              
              <QuickNoteDialog
                trigger={
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Note
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search your knowledge base..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full max-w-md"
            />
          </div>
        </div>

        {/* View Controls and Tabs */}
        <div className="flex items-center justify-between mb-6">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All Entries</TabsTrigger>
                <TabsTrigger value="journal">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Journal
                </TabsTrigger>
                <TabsTrigger value="notes">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Notes
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setView("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <TabsContent value="all" className="mt-6">
              <EntryList 
                entries={displayEntries} 
                isLoading={isLoadingAll || isSearching} 
                view={view}
                emptyMessage={searchQuery ? "No entries found matching your search." : "No entries yet. Create your first journal entry or quick note!"}
              />
            </TabsContent>

            <TabsContent value="journal" className="mt-6">
              <EntryList 
                entries={journalEntries} 
                isLoading={isLoadingJournal} 
                view={view}
                emptyMessage="No journal entries yet. Click 'Today's Journal' to get started!"
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <EntryList 
                entries={noteEntries} 
                isLoading={isLoadingNotes} 
                view={view}
                emptyMessage="No quick notes yet. Click 'Quick Note' to capture your first thought!"
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface EntryListProps {
  entries: Entry[];
  isLoading: boolean;
  view: "list" | "grid";
  emptyMessage: string;
}

function EntryList({ entries, isLoading, view, emptyMessage }: EntryListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  const gridClasses = view === "grid" 
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
    : "space-y-4";

  return (
    <div className={gridClasses}>
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const isNote = entry.type === "note";
  const preview = entry.content.slice(0, 200) + (entry.content.length > 200 ? "..." : "");
  
  // Extract hashtags
  const hashtags = entry.content.match(/#[\w]+/g) || [];
  
  return (
    <Link href={`/entry/${entry.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {isNote ? (
              <Lightbulb className="h-5 w-5 text-yellow-500" />
            ) : (
              <BookOpen className="h-5 w-5 text-blue-500" />
            )}
            <Badge variant={isNote ? "secondary" : "default"}>
              {isNote ? "Note" : "Journal"}
            </Badge>
          </div>
          <span className="text-sm text-gray-500">
            {new Date(entry.date).toLocaleDateString()}
          </span>
        </div>
        
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {entry.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
          {preview}
        </p>
        
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {hashtags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {hashtags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{hashtags.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}