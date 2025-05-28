import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, BookOpen, Lightbulb, Plus, Search, LayoutGrid, List, User, MapPin, Package, Download } from "lucide-react";
import QuickNoteDialog from "@/components/quick-note-dialog";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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

  const { data: peopleEntries = [], isLoading: isLoadingPeople } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { type: "person" }],
    queryFn: () => fetch("/api/entries?type=person").then(res => res.json()),
  });

  const { data: placeEntries = [], isLoading: isLoadingPlaces } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { type: "place" }],
    queryFn: () => fetch("/api/entries?type=place").then(res => res.json()),
  });

  const { data: thingEntries = [], isLoading: isLoadingThings } = useQuery<Entry[]>({
    queryKey: ["/api/entries", { type: "thing" }],
    queryFn: () => fetch("/api/entries?type=thing").then(res => res.json()),
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
            
            <div className="flex items-center space-x-2">
              <Link href="/entry/today">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4">
                  <Calendar className="h-4 w-4" />
                  <span className="ml-2 hidden md:inline">Today's Journal</span>
                </Button>
              </Link>
              
              <QuickNoteDialog
                trigger={
                  <Button variant="outline" className="px-3 md:px-4">
                    <Plus className="h-4 w-4" />
                    <span className="ml-2 hidden md:inline">Quick Note</span>
                  </Button>
                }
              />
              
              {/* Desktop buttons with text */}
              <div className="hidden md:flex items-center space-x-2">
                <CreateEntryDialog type="person" />
                <CreateEntryDialog type="place" />
                <CreateEntryDialog type="thing" />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/api/export/markdown';
                    link.download = `knowledge-export-${new Date().toISOString().split('T')[0]}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>

              {/* Mobile version of desktop buttons */}
              <div className="flex md:hidden items-center space-x-1">
                <CreateEntryDialog type="person" />
                <CreateEntryDialog type="place" />
                <CreateEntryDialog type="thing" />
                
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/api/export/markdown';
                    link.download = `knowledge-export-${new Date().toISOString().split('T')[0]}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0">
          <Tabs defaultValue="all" className="w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <TabsList className="grid w-full grid-cols-6 md:w-auto md:flex">
                <TabsTrigger value="all" className="px-1 md:px-4 text-xs md:text-sm">
                  <span className="hidden md:inline">All Entries</span>
                  <span className="md:hidden">All</span>
                </TabsTrigger>
                <TabsTrigger value="journal" className="px-1 md:px-4 text-xs md:text-sm">
                  <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="ml-1 hidden md:inline">Journal</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="px-1 md:px-4 text-xs md:text-sm">
                  <Lightbulb className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="ml-1 hidden md:inline">Notes</span>
                </TabsTrigger>
                <TabsTrigger value="people" className="px-1 md:px-4 text-xs md:text-sm">
                  <User className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="ml-1 hidden md:inline">People</span>
                </TabsTrigger>
                <TabsTrigger value="places" className="px-1 md:px-4 text-xs md:text-sm">
                  <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="ml-1 hidden md:inline">Places</span>
                </TabsTrigger>
                <TabsTrigger value="things" className="px-1 md:px-4 text-xs md:text-sm">
                  <Package className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="ml-1 hidden md:inline">Things</span>
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center justify-center space-x-2 md:justify-start">
                <Button
                  variant={view === "list" ? "default" : "outline"}
                  size="sm"
                  className="px-2"
                  onClick={() => setView("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === "grid" ? "default" : "outline"}
                  size="sm"
                  className="px-2"
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

            <TabsContent value="people" className="mt-6">
              <EntryList 
                entries={peopleEntries} 
                isLoading={isLoadingPeople} 
                view={view}
                emptyMessage="No people entries yet. Add someone to your knowledge base!"
              />
            </TabsContent>

            <TabsContent value="places" className="mt-6">
              <EntryList 
                entries={placeEntries} 
                isLoading={isLoadingPlaces} 
                view={view}
                emptyMessage="No places recorded yet. Document important locations!"
              />
            </TabsContent>

            <TabsContent value="things" className="mt-6">
              <EntryList 
                entries={thingEntries} 
                isLoading={isLoadingThings} 
                view={view}
                emptyMessage="No things catalogued yet. Keep track of important objects and concepts!"
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
  const preview = entry.content.slice(0, 200) + (entry.content.length > 200 ? "..." : "");
  
  // Extract hashtags
  const hashtags = entry.content.match(/#[\w]+/g) || [];
  
  // Get icon and styling based on entry type
  const getEntryDisplay = (type: string) => {
    switch (type) {
      case "note":
        return { icon: <Lightbulb className="h-5 w-5 text-yellow-500" />, label: "Note", variant: "secondary" as const };
      case "person":
        return { icon: <User className="h-5 w-5 text-green-500" />, label: "Person", variant: "default" as const };
      case "place":
        return { icon: <MapPin className="h-5 w-5 text-red-500" />, label: "Place", variant: "default" as const };
      case "thing":
        return { icon: <Package className="h-5 w-5 text-purple-500" />, label: "Thing", variant: "default" as const };
      default:
        return { icon: <BookOpen className="h-5 w-5 text-blue-500" />, label: "Journal", variant: "default" as const };
    }
  };

  const { icon, label, variant } = getEntryDisplay(entry.type);
  
  return (
    <Link href={`/entry/${entry.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            {icon}
            <Badge variant={variant}>
              {label}
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

// Unified dialog for creating new entries
function CreateEntryDialog({ type }: { type: "person" | "place" | "thing" }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const getDialogInfo = (type: string) => {
    switch (type) {
      case "person":
        return { icon: <User className="h-4 w-4" />, label: "Person", placeholder: "Person's name..." };
      case "place":
        return { icon: <MapPin className="h-4 w-4" />, label: "Place", placeholder: "Place name..." };
      case "thing":
        return { icon: <Package className="h-4 w-4" />, label: "Thing", placeholder: "Thing name..." };
      default:
        return { icon: <Plus className="h-4 w-4" />, label: "Entry", placeholder: "Entry title..." };
    }
  };

  const { icon, label, placeholder } = getDialogInfo(type);

  const createMutation = useMutation({
    mutationFn: async (data: { title: string; type: string }) => {
      const response = await apiRequest("POST", "/api/entries", data);
      return response.json();
    },
    onSuccess: (newEntry) => {
      toast({
        title: `${label} created`,
        description: `Your ${label.toLowerCase()} entry has been created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries", { type }] });
      setTitle("");
      setOpen(false);
      // Navigate to the new entry
      setLocation(`/entry/${newEntry.id}`);
    },
    onError: (error: any) => {
      console.error("Create entry error:", error);
      toast({
        title: "Error",
        description: `Failed to create ${label.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: `Please provide a name for your ${label.toLowerCase()}.`,
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({ title: title.trim(), type });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="md:px-3 px-2">
          {icon}
          <span className="ml-2 hidden md:inline">{label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add {label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder={placeholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim()}
            >
              {createMutation.isPending ? "Creating..." : `Add ${label}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}