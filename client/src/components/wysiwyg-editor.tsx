import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, Image } from "lucide-react";

interface WysiwygEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function WysiwygEditor({ content, onChange, placeholder }: WysiwygEditorProps) {
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
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
      // Insert image directly into the editor
      if (editorRef.current) {
        const img = document.createElement('img');
        img.src = data.url;
        img.alt = data.filename;
        img.className = 'max-w-full h-auto rounded-lg shadow-sm my-2';
        img.style.maxHeight = '400px';
        
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.insertNode(img);
          range.collapse(false);
        } else {
          editorRef.current.appendChild(img);
        }
        
        // Update content
        updateContent();
      }
      
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

  // Convert markdown to HTML for initial render
  const markdownToHtml = (markdown: string) => {
    return markdown
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg shadow-sm my-2" style="max-height: 400px" />')
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Line breaks
      .replace(/\n/g, '<br />');
  };

  // Convert HTML back to markdown
  const htmlToMarkdown = (html: string) => {
    // Create a temporary div to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Convert images back to markdown
    const images = temp.querySelectorAll('img');
    images.forEach(img => {
      const markdown = `![${img.alt}](${img.src})`;
      img.outerHTML = markdown;
    });
    
    // Convert formatting back to markdown
    let markdown = temp.innerHTML
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<div>/g, '\n')
      .replace(/<\/div>/g, '')
      .replace(/<p>/g, '')
      .replace(/<\/p>/g, '\n');
    
    return markdown.trim();
  };

  const updateContent = () => {
    if (editorRef.current) {
      const markdown = htmlToMarkdown(editorRef.current.innerHTML);
      onChange(markdown);
      
      // Auto-resize the editor
      autoResize();
    }
  };

  const autoResize = () => {
    if (editorRef.current) {
      // Reset height to auto to get the scroll height
      editorRef.current.style.height = 'auto';
      // Set height to scroll height with a minimum
      const newHeight = Math.max(400, editorRef.current.scrollHeight + 20);
      editorRef.current.style.height = `${newHeight}px`;
    }
  };

  // Initialize editor content and setup auto-resize
  useEffect(() => {
    if (editorRef.current && content !== htmlToMarkdown(editorRef.current.innerHTML)) {
      editorRef.current.innerHTML = markdownToHtml(content);
      // Auto-resize after content is loaded
      setTimeout(autoResize, 0);
    }
  }, [content]);

  // Setup auto-resize on mount
  useEffect(() => {
    autoResize();
  }, []);

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

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    updateContent();
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
          onClick={() => execCommand('bold')}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
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
      </div>

      {/* WYSIWYG Editor */}
      <div
        className={`relative ${dragOver ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div
          ref={editorRef}
          contentEditable
          onInput={updateContent}
          onPaste={handlePaste}
          className="w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 prose prose-sm max-w-none overflow-hidden resize-none"
          style={{ 
            wordBreak: 'break-word',
            minHeight: '400px',
            overflowY: 'hidden'
          }}
          suppressContentEditableWarning={true}
          data-placeholder={placeholder}
        />
        {!content && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
        {dragOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 border-2 border-dashed border-blue-400 rounded-lg">
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              Drop image here to upload
            </p>
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