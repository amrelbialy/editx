import { ImagePlus, Upload } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { useConfig } from "../../config/config-context";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { formatBytes } from "../../utils/validate-image";
import { Button } from "../ui/button";
import { focusRing } from "../ui/styles";

export interface ImagePanelProps {
  onAddImage: (file: File) => Promise<void>;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ImagePanel: React.FC<ImagePanelProps> = ({ onAddImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();
  const maxFileSize = useConfig().image?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

  const sizeHint = t("image.sizeHint").replace("{max}", formatBytes(maxFileSize));

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
    <div className="flex flex-col gap-fluid">
      <div className="text-fluid font-medium text-muted-foreground">{t("image.addImage")}</div>

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
          focusRing,
          isDragOver
            ? "border-primary bg-primary/10"
            : "border-border hover:border-muted-foreground hover:bg-accent/50",
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground @5xl/editor:h-8 @5xl/editor:w-8" />
        <span className="text-fluid text-muted-foreground">{t("image.dropHint")}</span>
        <span className="text-fluid text-muted-foreground/60">{sizeHint}</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="text-fluid text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {/* Quick add button */}
      <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
        <ImagePlus className="h-4 w-4" />
        {t("image.uploadButton")}
      </Button>
    </div>
  );
};
