import { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Link2, Image, Upload, List, ListOrdered } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface HashtagEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

interface AutocompleteEntry {
  id: number;
  title: string;
  type: string;
}

export default function HashtagEditor({ content, onChange, placeholder }: HashtagEditorProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  const [currentHashtag, setCurrentHashtag] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Query for autocomplete entries
  const { data: autocompleteEntries = [] } = useQuery<AutocompleteEntry[]>({
    queryKey: ["/api/entries/autocomplete"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      // Add entryId if available (this will need to be passed from parent component)
      const entryId = (window as any).currentEntryId;
      if (entryId) {
        formData.append("entryId", entryId.toString());
      }

      const response = await apiRequest("POST", "/api/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      const imageMarkdown = `\n![${data.filename}](${data.url})\n`;
      onChange(content + imageMarkdown);
      toast({
        title: "Image uploaded",
        description: "Image has been added to your entry.",
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const lines = content.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1];
      
      // Check if current line is a bullet point or numbered list
      const bulletMatch = currentLine.match(/^(\s*[-*+]\s)/);
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s/);
      
      if (bulletMatch) {
        e.preventDefault();
        const indent = bulletMatch[1];
        const newContent = content.substring(0, start) + '\n' + indent + content.substring(start);
        onChange(newContent);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + indent.length;
        }, 0);
      } else if (numberedMatch) {
        e.preventDefault();
        const indent = numberedMatch[1];
        const nextNumber = parseInt(numberedMatch[2]) + 1;
        const newListItem = `${indent}${nextNumber}. `;
        const newContent = content.substring(0, start) + '\n' + newListItem + content.substring(start);
        onChange(newContent);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + newListItem.length;
        }, 0);
      }
    }
  }, [content, onChange]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const cursorPosition = e.target.selectionStart;
    
    onChange(newContent);

    // Check for hashtag
    const textBeforeCursor = newContent.substring(0, cursorPosition);
    const hashtagMatch = textBeforeCursor.match(/#(\w*)$/);
    
    if (hashtagMatch) {
      const hashtag = hashtagMatch[1];
      setCurrentHashtag(hashtag);
      setShowSuggestions(true);
      
      // Calculate position for suggestions dropdown
      const textarea = e.target;
      const textMetrics = getTextMetrics(textarea, textBeforeCursor);
      setSuggestionPosition({
        top: textMetrics.top + 20,
        left: textMetrics.left,
      });
    } else {
      setShowSuggestions(false);
    }
  }, [onChange]);

  const getTextMetrics = (textarea: HTMLTextAreaElement, text: string) => {
    const div = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    
    div.style.font = style.font;
    div.style.lineHeight = style.lineHeight;
    div.style.padding = style.padding;
    div.style.border = style.border;
    div.style.whiteSpace = 'pre-wrap';
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.width = style.width;
    
    div.textContent = text;
    document.body.appendChild(div);
    
    const rect = div.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    
    document.body.removeChild(div);
    
    return {
      top: rect.height,
      left: rect.width % textarea.clientWidth,
    };
  };

  const selectSuggestion = (entry: AutocompleteEntry) => {
    if (!textareaRef.current) return;
    
    const cursorPosition = textareaRef.current.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPosition);
    const textAfterCursor = content.substring(cursorPosition);
    
    // Replace the current hashtag with the selected entry
    const newTextBefore = textBeforeCursor.replace(/#\w*$/, `#${entry.title}`);
    const newContent = newTextBefore + textAfterCursor;
    
    onChange(newContent);
    setShowSuggestions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newPosition = newTextBefore.length;
      textareaRef.current?.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const filteredSuggestions = autocompleteEntries.filter(entry =>
    entry.title.toLowerCase().includes(currentHashtag.toLowerCase())
  ).slice(0, 5);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

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
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadMutation.mutate(file);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4 relative">
      {/* Toolbar */}
      <div className="flex items-center space-x-2 p-2 border-b border-gray-200">
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
          onClick={() => insertFormatting("[", "](url)")}
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting("- ", "")}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => insertFormatting("1. ", "")}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <Upload className="h-4 w-4 animate-spin" />
          ) : (
            <Image className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Editor */}
      <div
        className={`relative ${dragOver ? "ring-2 ring-primary ring-opacity-50" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder || "Start writing... Use # to link to other entries"}
          className="min-h-[400px] resize-none border-0 focus-visible:ring-0 text-base leading-relaxed"
        />
        
        {dragOver && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center rounded-lg">
            <div className="text-primary font-medium">Drop image here to upload</div>
          </div>
        )}

        {/* Hashtag Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div 
            className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-w-xs"
            style={{
              top: suggestionPosition.top,
              left: suggestionPosition.left,
            }}
          >
            {filteredSuggestions.map((entry) => (
              <button
                key={entry.id}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg"
                onClick={() => selectSuggestion(entry)}
              >
                <div className="font-medium">{entry.title}</div>
                <div className="text-xs text-gray-500 capitalize">{entry.type}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-secondary space-y-1">
        <p>
          <strong>Formatting:</strong> Use **bold**, *italic*, [links](url)
        </p>
        <p>
          <strong>Linking:</strong> Type # followed by entry names to link entries together
        </p>
        <p>
          <strong>Images:</strong> Paste images directly or drag & drop them into the editor
        </p>
      </div>
    </div>
  );
}