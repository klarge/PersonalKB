import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Calendar, StickyNote, BookOpen, User, MapPin, Package, Trash2, Lightbulb, Edit, Eye, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import WysiwygEditor from "@/components/wysiwyg-editor";
import HashtagRenderer from "@/components/hashtag-renderer";
import AutoResizeTextarea from "@/components/auto-resize-textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnifiedEntries } from "@/hooks/useUnifiedEntries";
import type { StoredEntry } from "@/lib/unified-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function EntryPage() {
  const [match, params] = useRoute("/entry/:id");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [structuredData, setStructuredData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const isToday = params?.id === "today";
  const entryId = isToday ? null : parseInt(params?.id || "0");

  // Use unified storage system for offline-first entry access
  const { getEntry, createEntry, updateEntry } = useUnifiedEntries();
  const [entry, setEntry] = useState<StoredEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Query for backlinks - entries that reference this one
  const { data: backlinks = [] } = useQuery<StoredEntry[]>({
    queryKey: ['/api/entries/backlinks', entry?.id],
    queryFn: async () => {
      if (!entry?.id) return [];
      const response = await fetch(`/api/entries/backlinks/${entry.id}`, {
        credentials: 'include'
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!entry?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Load entry data using unified storage
  useEffect(() => {
    async function loadEntry() {
      if (isToday) {
        // For today's entry, try to find existing or prepare for new
        const today = new Date().toISOString().split('T')[0];
        try {
          const todayEntry = await getEntry('journal', today);
          setEntry(todayEntry);
        } catch (err) {
          console.log("No today entry found, will create new");
          setEntry(null);
        }
      } else if (entryId && !isNaN(entryId)) {
        try {
          const foundEntry = await getEntry(entryId);
          setEntry(foundEntry);
        } catch (err) {
          setError(err as Error);
          console.error("Entry not found:", err);
        }
      }
      setIsLoading(false);
    }

    loadEntry();
  }, [entryId, isToday]); // Removed getEntry from dependencies to prevent infinite loop

  // Set edit mode based on entry status and URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const editFromUrl = urlParams.get('edit') === 'true';
    
    if (isToday) {
      // Today's journal - always start in edit mode
      setIsEditing(true);
      if (!entry) {
        const today = new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        setTitle(today);
      }
    } else if (entry) {
      // Check URL parameter first, then fall back to content-based logic
      if (editFromUrl) {
        setIsEditing(true);
      } else {
        // Existing entry with content - start in view mode
        // New entry without content - start in edit mode
        setIsEditing(!entry.content || entry.content.trim() === "");
      }
    } else if (entryId && !isLoading && error) {
      // New entry (ID exists but entry not found) - start in edit mode
      setIsEditing(true);
    }
  }, [entry, isToday, entryId, isLoading, error]);

  // Update local state when entry data loads
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || "");
      setContent(entry.content || "");
      setStructuredData(entry.structuredData || {});
    }
  }, [entry]);

  // Handle keyboard navigation for mobile
  useEffect(() => {
    if (!isMobile) return;

    const handleKeyboardResize = () => {
      const visualViewport = window.visualViewport;
      if (!visualViewport) return;

      const heightDiff = window.innerHeight - visualViewport.height;
      const isKeyboardOpen = heightDiff > 150;

      if (isKeyboardOpen && (editorRef.current || contentRef.current)) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
          setTimeout(() => {
            activeElement.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }, 100);
        }
      }
    };

    const handleResize = () => {
      handleKeyboardResize();
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleKeyboardResize);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleKeyboardResize);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  // Handle save using unified storage
  const handleSave = async () => {
    try {
      if (!title.trim()) {
        toast({
          title: "Missing title",
          description: "Please provide a title for your entry.",
          variant: "destructive",
        });
        return;
      }

      if (entry?.id) {
        // Update existing entry
        await updateEntry({
          id: entry.id,
          title: title.trim(),
          content: content.trim(),
          structuredData
        });
        
        // Update local state
        setEntry(prev => prev ? { ...prev, title: title.trim(), content: content.trim(), structuredData } : null);
        
        toast({
          title: "Entry saved",
          description: "Your changes have been saved successfully.",
        });
        
        setIsEditing(false);
      } else {
        // Create new entry
        const entryType = isToday ? 'journal' : 'note';
        const entryDate = new Date().toISOString().split('T')[0];
        
        await createEntry({
          title: title.trim(),
          content: content.trim(),
          type: entryType,
          date: entryDate,
          structuredData
        });
        
        toast({
          title: "Entry created",
          description: "Your new entry has been created successfully.",
        });
        
        // Navigate back to home
        setLocation("/");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({
        title: "Error",
        description: "Failed to save entry. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!entry?.id) {
      toast({
        title: "Error",
        description: "Cannot delete entry - entry not found.",
        variant: "destructive",
      });
      return;
    }

    if (window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      try {
        // Use the unified storage system for deletion
        const response = await fetch(`/api/entries/${entry.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to delete entry');
        }

        toast({
          title: "Entry deleted",
          description: "Your entry has been deleted successfully.",
        });

        // Invalidate all entry queries to force refresh
        queryClient.invalidateQueries({ queryKey: ['/api/entries'] });
        queryClient.removeQueries({ queryKey: ['/api/entries', entry.id] });

        // Navigate back to home
        setLocation("/");
      } catch (error) {
        console.error("Delete error:", error);
        toast({
          title: "Error",
          description: "Failed to delete entry. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const updateStructuredField = (field: string, value: string) => {
    setStructuredData((prev: any) => ({ ...prev, [field]: value }));
  };

  const getStructuredFields = () => {
    if (!entry?.type) return null;

    const getFieldClassName = () => {
      return isMobile 
        ? "flex flex-col space-y-2 mb-4" 
        : "grid grid-cols-2 gap-4 mb-4";
    };

    switch (entry.type) {
      case "person":
        return (
          <div className={getFieldClassName()}>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={structuredData.email || ""}
                onChange={(e) => updateStructuredField("email", e.target.value)}
                placeholder="Email address"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={structuredData.phone || ""}
                onChange={(e) => updateStructuredField("phone", e.target.value)}
                placeholder="Phone number"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={structuredData.company || ""}
                onChange={(e) => updateStructuredField("company", e.target.value)}
                placeholder="Company"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input
                id="role"
                value={structuredData.role || ""}
                onChange={(e) => updateStructuredField("role", e.target.value)}
                placeholder="Job title or role"
                disabled={!isEditing}
              />
            </div>
          </div>
        );
      case "place":
        return (
          <div className={getFieldClassName()}>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={structuredData.address || ""}
                onChange={(e) => updateStructuredField("address", e.target.value)}
                placeholder="Street address"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={structuredData.city || ""}
                onChange={(e) => updateStructuredField("city", e.target.value)}
                placeholder="City"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="coordinates">Coordinates</Label>
              <Input
                id="coordinates"
                value={structuredData.coordinates || ""}
                onChange={(e) => updateStructuredField("coordinates", e.target.value)}
                placeholder="Latitude, Longitude"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={structuredData.category || ""}
                onChange={(e) => updateStructuredField("category", e.target.value)}
                placeholder="Restaurant, Park, Office, etc."
                disabled={!isEditing}
              />
            </div>
          </div>
        );
      case "thing":
        return (
          <div className={getFieldClassName()}>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={structuredData.category || ""}
                onChange={(e) => updateStructuredField("category", e.target.value)}
                placeholder="Book, Movie, Product, etc."
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="brand">Brand/Author</Label>
              <Input
                id="brand"
                value={structuredData.brand || ""}
                onChange={(e) => updateStructuredField("brand", e.target.value)}
                placeholder="Brand or author"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="model">Model/Version</Label>
              <Input
                id="model"
                value={structuredData.model || ""}
                onChange={(e) => updateStructuredField("model", e.target.value)}
                placeholder="Model or version"
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                value={structuredData.price || ""}
                onChange={(e) => updateStructuredField("price", e.target.value)}
                placeholder="$0.00"
                disabled={!isEditing}
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  // Extract hashtags from content
  const hashtags = content.match(/#[\w]+/g) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading entry...</p>
        </div>
      </div>
    );
  }

  if (!isToday && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Entry Not Found</h1>
          <p className="text-gray-600 mb-4">The entry you're looking for doesn't exist or couldn't be loaded.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getEntryIcon = () => {
    if (isToday) return <Calendar className="h-5 w-5" />;
    if (!entry?.type) return <StickyNote className="h-5 w-5" />;
    
    switch (entry.type) {
      case "journal": return <Calendar className="h-5 w-5" />;
      case "note": return <StickyNote className="h-5 w-5" />;
      case "person": return <User className="h-5 w-5" />;
      case "place": return <MapPin className="h-5 w-5" />;
      case "thing": return <Package className="h-5 w-5" />;
      default: return <StickyNote className="h-5 w-5" />;
    }
  };

  const getEntryTypeLabel = () => {
    if (isToday) return "Today's Journal";
    if (!entry?.type) return "Note";
    
    switch (entry.type) {
      case "journal": return "Journal Entry";
      case "note": return "Note";
      case "person": return "Person";
      case "place": return "Place";
      case "thing": return "Thing";
      default: return "Note";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              
              <div className="flex items-center space-x-2">
                {getEntryIcon()}
                <span className="text-sm font-medium text-gray-600">
                  {getEntryTypeLabel()}
                </span>

              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  {entry && (
                    <Button 
                      onClick={() => setIsEditing(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Button 
                    onClick={() => setIsEditing(true)} 
                    variant="outline" 
                    size="sm"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    onClick={handleDelete} 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Title */}
          <div className="mb-6">
            {isEditing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className="text-2xl font-bold border-none shadow-none p-0 focus-visible:ring-0"
                style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
                autoFocus={false}
                disabled={false}
              />
            ) : (
              <h1 className="text-2xl font-bold text-gray-900">
                {title || "Untitled"}
              </h1>
            )}
          </div>

          {/* Structured Fields */}
          {getStructuredFields()}

          {/* Content */}
          <div className="mb-6" ref={contentRef}>
            {isEditing ? (
              <div ref={editorRef}>
                <WysiwygEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing..."
                />
              </div>
            ) : (
              <div className="prose prose-gray dark:prose-invert max-w-none text-gray-900 dark:text-gray-100">
                <HashtagRenderer content={content} />
              </div>
            )}
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {hashtags.map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Backlinks Section */}
          {backlinks && backlinks.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
                <Link2 className="h-5 w-5 mr-2" />
                Referenced by {backlinks.length} {backlinks.length === 1 ? 'entry' : 'entries'}
              </h3>
              <div className="space-y-3">
                {backlinks.map((linkedEntry) => (
                  <Link key={linkedEntry.id} href={`/entry/${linkedEntry.id}`}>
                    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {linkedEntry.type === 'journal' && <Calendar className="h-4 w-4 text-blue-500" />}
                          {linkedEntry.type === 'note' && <StickyNote className="h-4 w-4 text-green-500" />}
                          {linkedEntry.type === 'person' && <User className="h-4 w-4 text-purple-500" />}
                          {linkedEntry.type === 'place' && <MapPin className="h-4 w-4 text-red-500" />}
                          {linkedEntry.type === 'thing' && <Package className="h-4 w-4 text-orange-500" />}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {linkedEntry.title}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(linkedEntry.date || linkedEntry.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {linkedEntry.content && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 line-clamp-2">
                          {linkedEntry.content.slice(0, 150)}...
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Entry Metadata */}
          {entry && (
            <div className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between">
                <span>Created: {new Date(entry.createdAt || entry.date).toLocaleDateString()}</span>
                {entry.updatedAt && (
                  <span>Updated: {new Date(entry.updatedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}