import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface QuickNoteDialogProps {
  trigger?: React.ReactNode;
}

export default function QuickNoteDialog({ trigger }: QuickNoteDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createNoteMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const response = await apiRequest("POST", "/api/entries", {
        ...data,
        type: "note"
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Note created",
        description: "Your quick note has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/entries", { type: "note" }] });
      setTitle("");
      setContent("");
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and content for your note.",
        variant: "destructive",
      });
      return;
    }
    createNoteMutation.mutate({ title: title.trim(), content: content.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Note</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Quick Note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="text"
              placeholder="Note title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full"
            />
          </div>
          <div>
            <Textarea
              placeholder="Write your note here... Use #hashtags to connect ideas!"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[120px] resize-none"
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
              disabled={createNoteMutation.isPending || !title.trim() || !content.trim()}
            >
              {createNoteMutation.isPending ? "Creating..." : "Create Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}