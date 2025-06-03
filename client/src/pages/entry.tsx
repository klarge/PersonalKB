import { useState, useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Calendar, StickyNote, BookOpen, User, MapPin, Package, Trash2, Lightbulb, Edit, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import WysiwygEditor from "@/components/wysiwyg-editor";
import HashtagRenderer from "@/components/hashtag-renderer";
import AutoResizeTextarea from "@/components/auto-resize-textarea";
import type { Entry } from "@shared/schema";
import { useIsMobile } from "@/hooks/use-mobile";

export default function EntryPage() {
  const [match, params] = useRoute("/entry/:id");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [structuredData, setStructuredData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const isToday = params?.id === "today";
  const entryId = isToday ? null : parseInt(params?.id || "0");

  // Query for entry data
  const { data: entry, isLoading, error } = useQuery<Entry & { tags?: any[] }>({
    queryKey: isToday ? ["/api/entries/today"] : ["/api/entries", entryId],
    queryFn: async () => {
      const url = isToday ? "/api/entries/today" : `/api/entries/${entryId}`;
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: isToday || (!!entryId && !isNaN(entryId)),
    retry: false,
  });

  // Query for backlinks - entries that reference this one
  const { data: backlinks = [] } = useQuery<Entry[]>({
    queryKey: ["/api/entries/backlinks", entry?.id],
    queryFn: () => fetch(`/api/entries/backlinks/${entry?.id}`).then(res => res.json()),
    enabled: !!entry?.id,
  });

  // Set edit mode based on entry status
  useEffect(() => {
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
      // Existing entry with content - start in view mode
      // New entry without content - start in edit mode
      setIsEditing(!entry.content || entry.content.trim() === "");
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
      // Set global entry ID for image uploads
      (window as any).currentEntryId = entry.id;
    }
  }, [entry]);

  // Android keyboard handling - scroll to focused input
  useEffect(() => {
    if (!isMobile) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.contentEditable === 'true') {
        setTimeout(() => {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300); // Delay to allow keyboard to show
      }
    };

    const handleResize = () => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT' || activeElement.contentEditable === 'true')) {
        setTimeout(() => {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  // Mutation for updating entry
  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; structuredData?: any }) => {
      if (!entry?.id) throw new Error("Entry not found");
      
      const response = await apiRequest("PUT", `/api/entries/${entry.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry saved",
        description: "Your changes have been saved successfully.",
      });
      // Invalidate all entry-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/entries/autocomplete"] });
      if (isToday) {
        queryClient.invalidateQueries({ queryKey: ["/api/entries/today"] });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting entry
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!entry?.id) throw new Error("Entry not found");
      
      await apiRequest("DELETE", `/api/entries/${entry.id}`);
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Entry deleted",
        description: "Your entry has been deleted successfully.",
      });
      // Invalidate all entry-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/entries/autocomplete"] });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please provide a title for your entry.",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate({ title: title.trim(), content: content.trim(), structuredData });
  };

  const updateStructuredField = (field: string, value: string) => {
    setStructuredData((prev: any) => ({ ...prev, [field]: value }));
  };

  const getStructuredFields = () => {
    if (!entry?.type) return null;

    const getFieldClassName = () => {
      return !isEditing 
        ? "bg-gray-50 dark:bg-gray-800 cursor-default text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 pointer-events-none" 
        : "dark:bg-gray-800 dark:border-gray-600 dark:text-white";
    };

    switch (entry.type) {
      case "person":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={structuredData.name || ""}
                onChange={(e) => updateStructuredField("name", e.target.value)}
                placeholder="Enter full name"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={structuredData.dateOfBirth || ""}
                onChange={(e) => updateStructuredField("dateOfBirth", e.target.value)}
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={structuredData.phone || ""}
                onChange={(e) => updateStructuredField("phone", e.target.value)}
                placeholder="Phone number"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={structuredData.email || ""}
                onChange={(e) => updateStructuredField("email", e.target.value)}
                placeholder="Email address"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={structuredData.address || ""}
                onChange={(e) => updateStructuredField("address", e.target.value)}
                placeholder="Home address"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={structuredData.occupation || ""}
                onChange={(e) => updateStructuredField("occupation", e.target.value)}
                placeholder="Job title/profession"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={structuredData.company || ""}
                onChange={(e) => updateStructuredField("company", e.target.value)}
                placeholder="Company name"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
          </div>
        );

      case "place":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={structuredData.address || ""}
                onChange={(e) => updateStructuredField("address", e.target.value)}
                placeholder="Full address"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={structuredData.category || ""}
                onChange={(e) => updateStructuredField("category", e.target.value)}
                placeholder="e.g., Restaurant, Park, Office"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={structuredData.website || ""}
                onChange={(e) => updateStructuredField("website", e.target.value)}
                placeholder="Website URL"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={structuredData.phone || ""}
                onChange={(e) => updateStructuredField("phone", e.target.value)}
                placeholder="Phone number"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="rating">Rating</Label>
              <Input
                id="rating"
                type="number"
                min="1"
                max="5"
                step="0.1"
                value={structuredData.rating || ""}
                onChange={(e) => updateStructuredField("rating", e.target.value)}
                placeholder="1-5 stars"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="visitedDate">Last Visited</Label>
              <Input
                id="visitedDate"
                type="date"
                value={structuredData.visitedDate || ""}
                onChange={(e) => updateStructuredField("visitedDate", e.target.value)}
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
          </div>
        );

      case "thing":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={structuredData.brand || ""}
                onChange={(e) => updateStructuredField("brand", e.target.value)}
                placeholder="Brand name"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={structuredData.model || ""}
                onChange={(e) => updateStructuredField("model", e.target.value)}
                placeholder="Model name/number"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={structuredData.category || ""}
                onChange={(e) => updateStructuredField("category", e.target.value)}
                placeholder="e.g., Electronics, Book, Tool"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={structuredData.price || ""}
                onChange={(e) => updateStructuredField("price", e.target.value)}
                placeholder="Purchase price"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={structuredData.purchaseDate || ""}
                onChange={(e) => updateStructuredField("purchaseDate", e.target.value)}
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={structuredData.location || ""}
                onChange={(e) => updateStructuredField("location", e.target.value)}
                placeholder="Where is it stored?"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={structuredData.serialNumber || ""}
                onChange={(e) => updateStructuredField("serialNumber", e.target.value)}
                placeholder="Serial/ID number"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="warranty">Warranty Until</Label>
              <Input
                id="warranty"
                type="date"
                value={structuredData.warranty || ""}
                onChange={(e) => updateStructuredField("warranty", e.target.value)}
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      deleteMutation.mutate();
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

  if (!isToday && (!entry || !entryId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Entry not found</h2>
          <p className="text-gray-600 mb-4">The entry you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get display info based on entry type
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

  const { icon, label, variant } = getEntryDisplay(entry?.type || "journal");

  // Get placeholder text based on entry type
  const getPlaceholderText = (type?: string) => {
    switch (type) {
      case "note":
        return "Note title...";
      case "person":
        return "Person's name...";
      case "place":
        return "Place name...";
      case "thing":
        return "Thing name...";
      default:
        return "Journal entry title...";
    }
  };

  // Get content placeholder based on entry type
  const getContentPlaceholder = (type?: string) => {
    switch (type) {
      case "note":
        return "Write your note here... Use #hashtags to connect related ideas!";
      case "person":
        return "Write about this person... Use #hashtags to link related thoughts!";
      case "place":
        return "Describe this place... Use #hashtags to connect related entries!";
      case "thing":
        return "Document this item or concept... Use #hashtags to link ideas!";
      default:
        return "Start writing your journal entry... Use #hashtags to link your thoughts!";
    }
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "note":
        return <StickyNote className="h-4 w-4 text-yellow-500" />;
      case "person":
        return <User className="h-4 w-4 text-green-500" />;
      case "place":
        return <MapPin className="h-4 w-4 text-red-500" />;
      case "thing":
        return <Package className="h-4 w-4 text-purple-500" />;
      default:
        return <BookOpen className="h-4 w-4 text-blue-500" />;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading entry...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || (!entry && !isToday)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Entry not found</h2>
          <p className="text-gray-600 mb-6">The entry you're looking for doesn't exist.</p>
          <Link href="/">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              
              <div className="flex items-center space-x-2">
                {icon}
                <Badge variant={variant}>
                  {label}
                </Badge>
                {isToday && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Today
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button 
                onClick={() => setIsEditing(!isEditing)}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:bg-gray-900"
                title={isEditing ? "View" : "Edit"}
              >
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                {!isMobile && (
                  <>
                    <span className="ml-2">{isEditing ? "View" : "Edit"}</span>
                  </>
                )}
              </Button>
              
              {!isToday && (
                <Button 
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 dark:bg-gray-900 dark:border-gray-600"
                  title={deleteMutation.isPending ? "Deleting..." : "Delete"}
                >
                  <Trash2 className="h-4 w-4" />
                  {!isMobile && (
                    <span className="ml-2">{deleteMutation.isPending ? "Deleting..." : "Delete"}</span>
                  )}
                </Button>
              )}
              
              {isEditing && (
                <Button 
                  onClick={handleSave}
                  disabled={updateMutation.isPending || !title.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                  title={updateMutation.isPending ? "Saving..." : "Save"}
                >
                  <Save className="h-4 w-4" />
                  {!isMobile && (
                    <span className="ml-2">{updateMutation.isPending ? "Saving..." : "Save"}</span>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 shadow-sm">
          <div className={`p-6 ${isMobile ? 'pb-96' : ''}`} ref={contentRef}>
            {/* Title Input */}
            <div className="mb-3">
              <AutoResizeTextarea
                placeholder={getPlaceholderText(entry?.type)}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full text-2xl font-semibold border-none px-0 focus:ring-0 placeholder:text-gray-400 bg-transparent dark:text-white dark:placeholder:text-gray-500"
                readOnly={!isEditing}
                minHeight={48}
                maxHeight={120}
              />
            </div>
            
            {/* Entry Metadata */}
            {entry && (
              <div className="flex items-center space-x-4 text-sm text-gray-500 mb-6 pb-4 border-b">
                <span>
                  Created: {entry.date ? new Date(entry.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }) : "Recently"}
                </span>
                {entry.updatedAt && entry.updatedAt !== entry.date && (
                  <span>
                    Updated: {new Date(entry.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
            
            {/* Structured Fields */}
            {getStructuredFields() && (
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-4">Details</h3>
                {getStructuredFields()}
              </div>
            )}

            {/* Content Editor/Viewer with Markdown Support */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">
                {entry?.type === "journal" ? "Journal Entry" : 
                 entry?.type === "note" ? "Notes" : "Description"}
              </h3>
              
              {isEditing ? (
                <WysiwygEditor
                  content={content}
                  onChange={setContent}
                  placeholder={getContentPlaceholder(entry?.type)}
                />
              ) : (
                <div className="min-h-[400px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <HashtagRenderer content={content || "No content yet. Click 'Edit' to add content."} />
                </div>
              )}
            </div>
            


            {/* Backlinks Section */}
            {backlinks.length > 0 && (
              <div className="border-t pt-4 mt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Connected Entries</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Other entries that reference this one:
                </p>
                <div className="space-y-3">
                  {backlinks.map((linkedEntry) => (
                    <Link key={linkedEntry.id} href={`/entry/${linkedEntry.id}`}>
                      <div className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-2 mb-1">
                          {getEntryIcon(linkedEntry.type)}
                          <h4 className="font-medium text-gray-900">{linkedEntry.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {linkedEntry.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {linkedEntry.content.slice(0, 150)}...
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(linkedEntry.date).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}