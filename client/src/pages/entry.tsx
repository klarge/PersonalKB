import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Calendar, StickyNote, BookOpen, User, MapPin, Package, Trash2, Lightbulb, Edit, Eye, Camera } from "lucide-react";
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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Get entryId from params
  const entryId = params?.id ? Number(params.id) : null;

  // Check if it's a journal entry for today
  const isToday = params?.id === "today";

  // Local state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [structuredData, setStructuredData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  // Query for entry data
  const { data: entry, isLoading, error } = useQuery<Entry>({
    queryKey: ["/api/entries", entryId],
    enabled: !!entryId && !isToday,
    retry: false,
  });

  // Set edit mode based on entry state
  useEffect(() => {
    if (isToday) {
      // Today's journal entry - get today's date
      if (!title) {
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

  // Mutation for updating entry
  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; structuredData?: any }) => {
      if (!entry?.id) throw new Error("Entry not found");
      
      const res = await apiRequest("PUT", `/api/entries/${entry.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry saved",
        description: "Your changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entries", entryId] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your changes. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for uploading images
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!entry?.id) throw new Error("Entry not found");
      
      const formData = new FormData();
      formData.append("image", file);
      formData.append("entryId", entry.id.toString());
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      // For profile photos, save the URL to structured data
      if (entry?.type === "person") {
        updateStructuredField("profilePhoto", data.url);
      }
      toast({
        title: "Image uploaded",
        description: "Your image has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
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
        title: "Title required",
        description: "Please enter a title for your entry.",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate({
      title: title.trim(),
      content,
      structuredData,
    });
  };

  const updateStructuredField = (field: string, value: any) => {
    setStructuredData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const getFieldClassName = () => {
    return !isEditing
      ? "pointer-events-none bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      : "dark:bg-gray-800 dark:border-gray-600 dark:text-white";
  };

  const renderStructuredFields = () => {
    switch (entry?.type) {
      case "person":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="profilePhoto">Profile Photo</Label>
              {isEditing ? (
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && entry?.id) {
                        uploadImageMutation.mutate(file);
                      }
                    }}
                    className="hidden"
                    id="profilePhotoUpload"
                  />
                  <label
                    htmlFor="profilePhotoUpload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Upload Photo
                  </label>
                  {structuredData.profilePhoto && (
                    <div className="mt-2">
                      <img
                        src={structuredData.profilePhoto}
                        alt="Profile"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateStructuredField("profilePhoto", "")}
                        className="mt-2"
                      >
                        Remove Photo
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                structuredData.profilePhoto && (
                  <div className="mt-2">
                    <img
                      src={structuredData.profilePhoto}
                      alt="Profile"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  </div>
                )
              )}
            </div>
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
                placeholder="Enter address"
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
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={structuredData.category || ""}
                onChange={(e) => updateStructuredField("category", e.target.value)}
                placeholder="Restaurant, Shop, Park, etc."
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
                value={structuredData.rating || ""}
                onChange={(e) => updateStructuredField("rating", e.target.value)}
                placeholder="1-5 stars"
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
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                value={structuredData.price || ""}
                onChange={(e) => updateStructuredField("price", e.target.value)}
                placeholder="Price"
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center text-blue-600 hover:text-blue-700">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center space-x-2">
            {entry && !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-blue-600 border-blue-600 hover:bg-blue-50"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            
            {isEditing && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset changes
                    if (entry) {
                      setTitle(entry.title || "");
                      setContent(entry.content || "");
                      setStructuredData(entry.structuredData || {});
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            )}
            
            {entry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-600 border-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Entry Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Title */}
          <div className="mb-6">
            <Label htmlFor="title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Title
            </Label>
            {isEditing ? (
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter title..."
                className="mt-2 text-lg font-medium"
              />
            ) : (
              <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {title || "Untitled"}
              </h1>
            )}
          </div>

          {/* Structured Fields */}
          {entry?.type && entry.type !== "journal" && entry.type !== "note" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {entry.type === "person" ? "Person Details" : 
                 entry.type === "place" ? "Place Details" : 
                 "Item Details"}
              </h2>
              {renderStructuredFields()}
            </div>
          )}

          {/* Content */}
          <div className="mb-6">
            <Label htmlFor="content" className="text-lg font-semibold text-gray-900 dark:text-white">
              Content
            </Label>
            {isEditing ? (
              <div className="mt-2">
                <WysiwygEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your entry..."
                />
              </div>
            ) : (
              <div className="mt-2 prose prose-lg max-w-none dark:prose-invert">
                <HashtagRenderer content={content} />
              </div>
            )}
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="mb-4">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tags
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {hashtags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          {entry && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Created: {new Date(entry.createdAt).toLocaleDateString()}
                </span>
                <span>
                  Updated: {new Date(entry.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}