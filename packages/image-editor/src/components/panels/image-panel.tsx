import { ImagePlus, Upload } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { cn } from "../../utils/cn";

export interface ImagePanelProps {
  onAddImage: (file: File) => Promise<void>;
}

export const ImagePanel: React.FC<ImagePanelProps> = ({ onAddImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        await onAddImage(file);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add image");
      }
    },
    [onAddImage],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so same file can be re-selected
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="text-xs font-medium text-muted-foreground">Add Image</div>

      {/* Drop zone / upload button */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-6",
          "border-2 border-dashed rounded-lg cursor-pointer transition-colors",
          isDragOver
            ? "border-primary bg-primary/10"
            : "border-border hover:border-muted-foreground hover:bg-accent/50",
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Drop image here or click to upload</span>
        <span className="text-xs text-muted-foreground/60">PNG, JPG, WebP — max 5 MB</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Quick add button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
          "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
        )}
      >
        <ImagePlus className="h-4 w-4" />
        Upload Image
      </button>
    </div>
  );
};
