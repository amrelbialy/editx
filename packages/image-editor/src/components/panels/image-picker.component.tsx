import { ImagePlus, Replace } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { Button } from "../ui";

export interface ImagePickerProps {
  src: string;
  onSelect: (file: File) => Promise<void> | void;
}

export const ImagePicker: React.FC<ImagePickerProps> = (props) => {
  const { src, onSelect } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      try {
        await onSelect(file);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Failed to load image");
      } finally {
        setIsLoading(false);
      }
    },
    [onSelect],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void handleFile(file);
      event.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="flex flex-col gap-3">
      {src && (
        <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
          <img src={src} alt="Selected preview" className="h-full w-full object-contain" />
        </div>
      )}

      <Button
        variant="secondary"
        className="w-full"
        disabled={isLoading}
        onClick={() => fileInputRef.current?.click()}
      >
        {src ? <Replace /> : <ImagePlus />}
        {isLoading ? "Loading..." : src ? "Replace Image" : "Choose Image"}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-fluid text-destructive">
          {error}
        </div>
      )}
    </div>
  );
};
