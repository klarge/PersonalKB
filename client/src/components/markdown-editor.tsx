import { useState, useCallback, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, Image, Eye, Edit } from "lucide-react";
import HashtagRenderer from "./hashtag-renderer";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function MarkdownEditor({ content, onChange, placeholder }: MarkdownEditorProps) {
  const [dragOver, setDragOver] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      const entryId = (window as any).currentEntryId;
      if (entryId) {
        formData.append("entryId", entryId.toString());
      }

      console.log("Uploading file:", file.name, file.size, "bytes");
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      const imageMarkdown = `\n![${data.filename}](${data.url})\n`;
      onChange(content + imageMarkdown);
      toast({
        title: "Image uploaded",
        description: "Image has been added to your entry",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          uploadMutation.mutate(file);
        }
        break;
      }
    }
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        uploadMutation.mutate(file);
      }
    }
  }, [uploadMutation]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const insertFormatting = (before: string, after: string = "") => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = 
      content.substring(0, start) + 
      before + selectedText + after + 
      content.substring(end);
    
    onChange(newContent);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = start + before.length;
        textareaRef.current.selectionEnd = start + before.length + selectedText.length;
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      uploadMutation.mutate(file);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting("**", "**")}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting("*", "*")}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting("- ")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          disabled={uploadMutation.isPending}
        >
          <Image className="h-4 w-4" />
        </Button>
        <div className="ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? <Edit className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Editor/Preview */}
      <div className="min-h-[200px]">
        {isPreviewMode ? (
          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 min-h-[200px]">
            <HashtagRenderer content={content} />
          </div>
        ) : (
          <div
            className={`relative ${dragOver ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              placeholder={placeholder}
              className="w-full min-h-[200px] p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
            />
            {dragOver && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 border-2 border-dashed border-blue-400 rounded-lg">
                <p className="text-blue-600 dark:text-blue-400 font-medium">
                  Drop image here to upload
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        className="hidden"
      />

      {uploadMutation.isPending && (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Uploading image...
        </p>
      )}
    </div>
  );
}