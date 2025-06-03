import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Camera, User, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PersonPhotoUploadProps {
  entryId: number;
  currentPhotoUrl?: string;
  onPhotoUpdate: (photoUrl: string | null) => void;
  isEditing: boolean;
}

export default function PersonPhotoUpload({ 
  entryId, 
  currentPhotoUrl, 
  onPhotoUpdate, 
  isEditing 
}: PersonPhotoUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("entryId", entryId.toString());

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
      const photoUrl = data.url;
      onPhotoUpdate(photoUrl);
      toast({
        title: "Photo uploaded",
        description: "Profile photo has been updated successfully.",
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

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      uploadMutation.mutate(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select an image file.",
        variant: "destructive",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemovePhoto = () => {
    onPhotoUpdate(null);
    toast({
      title: "Photo removed",
      description: "Profile photo has been removed.",
    });
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Avatar Display */}
      <div className="relative">
        <Avatar className="h-24 w-24">
          {currentPhotoUrl ? (
            <AvatarImage src={currentPhotoUrl} alt="Profile photo" />
          ) : (
            <AvatarFallback>
              <User className="h-10 w-10" />
            </AvatarFallback>
          )}
        </Avatar>
        
        {/* Remove button when editing and photo exists */}
        {isEditing && currentPhotoUrl && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemovePhoto}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Upload Controls */}
      {isEditing && (
        <div className="space-y-2">
          {/* Upload Button */}
          <Button
            type="button"
            variant="outline"
            onClick={openFileDialog}
            disabled={uploadMutation.isPending}
            className="flex items-center space-x-2"
          >
            <Camera className="h-4 w-4" />
            <span>
              {uploadMutation.isPending ? "Uploading..." : 
               currentPhotoUrl ? "Change Photo" : "Add Photo"}
            </span>
          </Button>

          {/* Drag & Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center text-sm text-gray-500 cursor-pointer transition-colors ${
              dragOver 
                ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFileDialog}
          >
            {dragOver ? (
              <p className="text-blue-600 dark:text-blue-400">Drop image here</p>
            ) : (
              <p>Drag & drop an image here or click to browse</p>
            )}
          </div>

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            accept="image/*"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
}