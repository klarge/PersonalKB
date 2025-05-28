import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Calendar, StickyNote, BookOpen, User, MapPin, Package, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import HashtagEditor from "@/components/hashtag-editor";
import type { Entry } from "@shared/schema";

export default function EntryPage() {
  const [match, params] = useRoute("/entry/:id");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [structuredData, setStructuredData] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const isToday = params?.id === "today";
  const entryId = isToday ? null : parseInt(params?.id || "0");

  // Query for entry data
  const { data: entry, isLoading } = useQuery<Entry & { tags?: any[] }>({
    queryKey: isToday ? ["/api/entries/today"] : ["/api/entries", entryId],
    queryFn: isToday 
      ? () => fetch("/api/entries/today").then(res => res.json())
      : () => fetch(`/api/entries/${entryId}`).then(res => res.json()),
    enabled: isToday || (!!entryId && !isNaN(entryId)),
  });

  // Query for backlinks - entries that reference this one
  const { data: backlinks = [] } = useQuery<Entry[]>({
    queryKey: ["/api/entries/backlinks", entry?.id],
    queryFn: () => fetch(`/api/entries/backlinks/${entry?.id}`).then(res => res.json()),
    enabled: !!entry?.id,
  });

  // Update local state when entry data loads
  useEffect(() => {
    if (entry) {
      setTitle(entry.title || "");
      setContent(entry.content || "");
      setStructuredData(entry.structuredData || {});
    } else if (isToday) {
      // Auto-set title for today's journal
      const today = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      setTitle(today);
    }
  }, [entry, isToday]);

  // Mutation for updating entry
  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; structuredData?: any }) => {
      if (!entry?.id) throw new Error("Entry not found");
      
      const response = await apiRequest("PATCH", `/api/entries/${entry.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
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
      
      const response = await apiRequest("DELETE", `/api/entries/${entry.id}`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry deleted",
        description: "Your entry has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
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
    setStructuredData(prev => ({ ...prev, [field]: value }));
  };

  const getStructuredFields = () => {
    if (!entry?.type) return null;

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
              />
            </div>
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={structuredData.dateOfBirth || ""}
                onChange={(e) => updateStructuredField("dateOfBirth", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={structuredData.phone || ""}
                onChange={(e) => updateStructuredField("phone", e.target.value)}
                placeholder="Phone number"
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
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={structuredData.address || ""}
                onChange={(e) => updateStructuredField("address", e.target.value)}
                placeholder="Home address"
              />
            </div>
            <div>
              <Label htmlFor="occupation">Occupation</Label>
              <Input
                id="occupation"
                value={structuredData.occupation || ""}
                onChange={(e) => updateStructuredField("occupation", e.target.value)}
                placeholder="Job title/profession"
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={structuredData.company || ""}
                onChange={(e) => updateStructuredField("company", e.target.value)}
                placeholder="Company name"
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
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={structuredData.category || ""}
                onChange={(e) => updateStructuredField("category", e.target.value)}
                placeholder="e.g., Restaurant, Park, Office"
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
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={structuredData.phone || ""}
                onChange={(e) => updateStructuredField("phone", e.target.value)}
                placeholder="Phone number"
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
              />
            </div>
            <div>
              <Label htmlFor="visitedDate">Last Visited</Label>
              <Input
                id="visitedDate"
                type="date"
                value={structuredData.visitedDate || ""}
                onChange={(e) => updateStructuredField("visitedDate", e.target.value)}
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
              />
            </div>
            <div>
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={structuredData.model || ""}
                onChange={(e) => updateStructuredField("model", e.target.value)}
                placeholder="Model name/number"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={structuredData.category || ""}
                onChange={(e) => updateStructuredField("category", e.target.value)}
                placeholder="e.g., Electronics, Book, Tool"
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
              />
            </div>
            <div>
              <Label htmlFor="purchaseDate">Purchase Date</Label>
              <Input
                id="purchaseDate"
                type="date"
                value={structuredData.purchaseDate || ""}
                onChange={(e) => updateStructuredField("purchaseDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={structuredData.location || ""}
                onChange={(e) => updateStructuredField("location", e.target.value)}
                placeholder="Where is it stored?"
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Serial Number</Label>
              <Input
                id="serialNumber"
                value={structuredData.serialNumber || ""}
                onChange={(e) => updateStructuredField("serialNumber", e.target.value)}
                placeholder="Serial/ID number"
              />
            </div>
            <div>
              <Label htmlFor="warranty">Warranty Until</Label>
              <Input
                id="warranty"
                type="date"
                value={structuredData.warranty || ""}
                onChange={(e) => updateStructuredField("warranty", e.target.value)}
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
              {!isToday && (
                <Button 
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  variant="outline"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              )}
              
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending || !title.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6">
            {/* Title Input */}
            <div className="mb-6">
              <Input
                type="text"
                placeholder={getPlaceholderText(entry?.type)}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-2xl font-semibold border-none px-0 focus:ring-0 placeholder:text-gray-400"
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

            {/* Content Editor with Hashtag Support */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-4">
                {entry?.type === "journal" ? "Journal Entry" : 
                 entry?.type === "note" ? "Notes" : "Description"}
              </h3>
              <HashtagEditor
                content={content}
                onChange={setContent}
                placeholder={getContentPlaceholder(entry?.type)}
              />
            </div>
            
            {/* Hashtags Display */}
            {hashtags.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Connected Ideas</h3>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

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