import type { CreativeEngine } from "@creative-editor/engine";
import { IMAGE_ORIGINAL_HEIGHT, IMAGE_ORIGINAL_WIDTH, IMAGE_SRC } from "@creative-editor/engine";
import { Replace } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../../utils/cn";

interface ImageFillPanelProps {
  engine: CreativeEngine;
  blockId: number;
  onReplace: (file: File) => void;
}

export const ImageFillPanel: React.FC<ImageFillPanelProps> = ({ engine, blockId, onReplace }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState("");
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [blockWidth, setBlockWidth] = useState(0);
  const [blockHeight, setBlockHeight] = useState(0);

  useEffect(() => {
    setImageSrc(engine.block.getString(blockId, IMAGE_SRC));
    setOriginalWidth(engine.block.getFloat(blockId, IMAGE_ORIGINAL_WIDTH));
    setOriginalHeight(engine.block.getFloat(blockId, IMAGE_ORIGINAL_HEIGHT));
    const { width: w, height: h } = engine.block.getSize(blockId);
    setBlockWidth(Math.round(w));
    setBlockHeight(Math.round(h));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(() => {
      setImageSrc(engine.block.getString(blockId, IMAGE_SRC));
      setOriginalWidth(engine.block.getFloat(blockId, IMAGE_ORIGINAL_WIDTH));
      setOriginalHeight(engine.block.getFloat(blockId, IMAGE_ORIGINAL_HEIGHT));
      const { width: w, height: h } = engine.block.getSize(blockId);
      setBlockWidth(Math.round(w));
      setBlockHeight(Math.round(h));
    });
  }, [engine, blockId]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onReplace(file);
        // Refresh state after replace
        setTimeout(() => {
          setImageSrc(engine.block.getString(blockId, IMAGE_SRC));
          setOriginalWidth(engine.block.getFloat(blockId, IMAGE_ORIGINAL_WIDTH));
          setOriginalHeight(engine.block.getFloat(blockId, IMAGE_ORIGINAL_HEIGHT));
          const { width: w2, height: h2 } = engine.block.getSize(blockId);
          setBlockWidth(Math.round(w2));
          setBlockHeight(Math.round(h2));
        }, 100);
      }
      // Reset so re-selecting same file triggers change
      e.target.value = "";
    },
    [engine, blockId, onReplace],
  );

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Preview thumbnail */}
      {imageSrc && (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border">
          <img src={imageSrc} alt="Fill preview" className="w-full h-full object-contain" />
        </div>
      )}

      {/* Replace button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex items-center justify-center gap-2 w-full h-8 rounded-md text-sm font-medium transition-colors @5xl/editor:h-9 @5xl/editor:text-base",
          "bg-accent hover:bg-accent/80 text-accent-foreground",
        )}
      >
        <Replace className="h-4 w-4" />
        Replace Image
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dimensions info */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide @5xl/editor:text-base">
          Dimensions
        </h4>
        <div className="grid grid-cols-2 gap-2 text-sm @5xl/editor:text-base">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground @5xl/editor:text-base">Display</span>
            <span className="tabular-nums">
              {blockWidth} × {blockHeight}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-muted-foreground @5xl/editor:text-base">Original</span>
            <span className="tabular-nums">
              {Math.round(originalWidth)} × {Math.round(originalHeight)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
