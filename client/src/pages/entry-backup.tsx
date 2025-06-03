import { useState, useEffect } from "react";
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
import PersonPhotoUpload from "@/components/person-photo-upload";
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
    enabled: isToday || !!entryId,
  });

  // Update local state when entry data loads
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || "");
      setContent(entry.content || "");
      setStructuredData(entry.structuredData || {});
    } else if (isToday) {
      setTitle("");
      setContent("");
      setStructuredData({});
      setIsEditing(true);
    }
  }, [entry, isToday]);

  // Mutation for updating/creating entry
  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; structuredData: any }) => {
      if (isToday) {
        // Create today's entry
        const res = await apiRequest("POST", "/api/entries", {
          title: data.title,
          content: data.content,
          type: "journal",
          structuredData: data.structuredData,
          date: new Date().toISOString(),
        });
        return res.json();
      } else {
        // Update existing entry
        const res = await apiRequest("PATCH", `/api/entries/${entry?.id}`, {
          title: data.title,
          content: data.content,
          structuredData: data.structuredData,
        });
        return res.json();
      }
    },
    onSuccess: (updatedEntry) => {
      setIsEditing(false);
      toast({
        title: isToday ? "Entry created" : "Entry updated",
        description: isToday ? "Your journal entry has been created." : "Your changes have been saved.",
      });

      if (isToday) {
        // Redirect to the new entry
        setLocation(`/entry/${updatedEntry.id}`);
      }

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
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/search"], exact: false });
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

  const updateStructuredField = (field: string, value: string | null) => {
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
          <div className="space-y-6">
            {/* Profile Photo Section */}
            <div>
              <Label>Profile Photo</Label>
              <PersonPhotoUpload
                entryId={entry.id}
                currentPhotoUrl={structuredData.photoUrl}
                onPhotoUpdate={(photoUrl: string | null) => updateStructuredField("photoUrl", photoUrl)}
                isEditing={isEditing}
              />
            </div>
            
            {/* Personal Details */}
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
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={structuredData.city || ""}
                onChange={(e) => updateStructuredField("city", e.target.value)}
                placeholder="City"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="state">State/Province</Label>
              <Input
                id="state"
                value={structuredData.state || ""}
                onChange={(e) => updateStructuredField("state", e.target.value)}
                placeholder="State or province"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={structuredData.country || ""}
                onChange={(e) => updateStructuredField("country", e.target.value)}
                placeholder="Country"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="coordinates">Coordinates</Label>
              <Input
                id="coordinates"
                value={structuredData.coordinates || ""}
                onChange={(e) => updateStructuredField("coordinates", e.target.value)}
                placeholder="Latitude, Longitude"
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
                placeholder="Restaurant, Park, etc."
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={structuredData.notes || ""}
                onChange={(e) => updateStructuredField("notes", e.target.value)}
                placeholder="Any additional information about this place"
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
                placeholder="Model or version"
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
                placeholder="Electronics, Book, etc."
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div>
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
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
              <Label htmlFor="warranty">Warranty</Label>
              <Input
                id="warranty"
                value={structuredData.warranty || ""}
                onChange={(e) => updateStructuredField("warranty", e.target.value)}
                placeholder="Warranty period"
                readOnly={!isEditing}
                className={getFieldClassName()}
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={structuredData.notes || ""}
                onChange={(e) => updateStructuredField("notes", e.target.value)}
                placeholder="Any additional information about this item"
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

  const entryDisplay = getEntryDisplay(entry?.type || "journal");
  const { icon, label, variant } = entryDisplay;

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
        return "Write your note here...";
      case "person":
        return "Write about this person...";
      case "place":
        return "Describe this place...";
      case "thing":
        return "Write about this item...";
      default:
        return "What's on your mind today?";
    }
  };

  const isJournalOrNote = entry?.type === "journal" || entry?.type === "note";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                
                <Badge variant={variant} className="flex items-center space-x-1">
                  {icon}
                  <span>{label}</span>
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

        <div className="bg-white dark:bg-gray-800 min-h-screen">
          <div className="p-6 space-y-6">
            {/* Title Section */}
            <div>
              <Label htmlFor="title" className="sr-only">Title</Label>
              {isEditing ? (
                <AutoResizeTextarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={getPlaceholderText(entry?.type)}
                  className="w-full text-3xl font-bold border-none bg-transparent p-0 focus:ring-0 resize-none placeholder:text-gray-400 dark:placeholder:text-gray-500 dark:text-white"
                  minHeight={60}
                />
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {title || "Untitled"}
                </h1>
              )}
            </div>

            {/* Structured Data Fields */}
            {getStructuredFields()}

            {/* Content Section */}
            <div className="border-t pt-6 dark:border-gray-700">
              <Label htmlFor="content" className="sr-only">Content</Label>
              {isEditing ? (
                <WysiwygEditor
                  content={content}
                  onChange={setContent}
                  placeholder={getContentPlaceholder(entry?.type)}
                />
              ) : (
                <div className="prose max-w-none dark:prose-invert">
                  <HashtagRenderer content={content} />
                </div>
              )}
            </div>

            {/* Hashtags Section */}
            {hashtags.length > 0 && (
              <div className="border-t pt-6 dark:border-gray-700">
                <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag, index) => (
                    <Link key={index} href={`/?search=${encodeURIComponent(tag)}`}>
                      <Badge variant="secondary" className="cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                        {tag}
                      </Badge>
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