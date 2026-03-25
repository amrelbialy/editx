import { ImagePlus, Upload } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";

export interface ImagePanelProps {
  onAddImage: (file: File) => Promise<void>;
}

export const ImagePanel: React.FC<ImagePanelProps> = ({ onAddImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        await onAddImage(file);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("image.addError"));
      }
    },
    [onAddImage, t],
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
      <div className="text-base font-medium text-muted-foreground">{t("image.addImage")}</div>

      {/* Drop zone / upload button */}
      <button
        type="button"
        aria-label={t("image.dropHint")}
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
        <span className="text-base text-muted-foreground">{t("image.dropHint")}</span>
        <span className="text-base text-muted-foreground/60">{t("image.sizeHint")}</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="text-base text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Quick add button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-base",
          "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
        )}
      >
        <ImagePlus className="h-4 w-4" />
        {t("image.uploadButton")}
      </button>
    </div>
  );
};
