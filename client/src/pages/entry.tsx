import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import RichTextEditor from "@/components/rich-text-editor";
import type { Entry } from "@shared/schema";

export default function EntryPage() {
  const [match, params] = useRoute("/entry/:id");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();

  const entryId = params?.id === "today" ? "today" : parseInt(params?.id || "0");
  const isToday = entryId === "today";

  const { data: entry, isLoading } = useQuery<Entry & { tags?: any[] }>({
    queryKey: isToday ? ["/api/entries/today"] : ["/api/entries", entryId],
    enabled: !!entryId,
  });

  useEffect(() => {
    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
    }
  }, [entry]);

  const updateMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      if (!entry) throw new Error("Entry not found");
      
      const response = await apiRequest("PATCH", `/api/entries/${entry.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Entry saved",
        description: "Your entry has been successfully saved.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries/today"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("Entry not found");
      
      await apiRequest("DELETE", `/api/entries/${entry.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Entry deleted",
        description: "Your entry has been successfully deleted.",
      });
      window.location.href = "/";
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate({ title, content });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this entry?")) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex bg-neutral">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-secondary">Loading entry...</div>
        </main>
        <MobileNav />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex bg-neutral">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-dark mb-2">Entry not found</h2>
            <p className="text-secondary">The entry you're looking for doesn't exist.</p>
            <Button 
              className="mt-4" 
              onClick={() => window.location.href = "/"}
            >
              Back to Home
            </Button>
          </div>
        </main>
        <MobileNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-neutral">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.location.href = "/"}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold border-none bg-transparent p-0 focus-visible:ring-0"
                placeholder="Entry title..."
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-secondary">
                {new Date(entry.date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-primary hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </header>

        {/* Editor */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-6">
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Start writing your thoughts..."
                />
              </div>
            </div>

            {/* Tags Display */}
            {entry.tags && entry.tags.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-dark mb-3">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full cursor-pointer hover:bg-blue-200 transition-colors"
                    >
                      #{tag.name}
                    </span>
                  ))}
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
