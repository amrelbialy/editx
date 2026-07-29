import type { EditxEngine } from "@editx/engine";
import { IMAGE_ORIGINAL_HEIGHT, IMAGE_ORIGINAL_WIDTH, IMAGE_SRC } from "@editx/engine";
import { Replace } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Section } from "../ui/section";

interface ImageFillPanelProps {
  engine: EditxEngine;
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
    <div className="flex flex-col gap-3 p-1">
      {/* Preview thumbnail */}
      {imageSrc && (
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border border-border">
          <img src={imageSrc} alt="Fill preview" className="w-full h-full object-contain" />
        </div>
      )}

      {/* Replace button */}
      <Button variant="secondary" className="w-full" onClick={() => fileInputRef.current?.click()}>
        <Replace className="h-4 w-4" />
        Replace Image
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Dimensions info */}
      <Section label="Dimensions">
        <div className="grid grid-cols-2 gap-2 text-fluid">
          <div className="flex flex-col gap-0.5">
            <span className="text-fluid text-muted-foreground">Display</span>
            <span className="tabular-nums">
              {blockWidth} × {blockHeight}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-fluid text-muted-foreground">Original</span>
            <span className="tabular-nums">
              {Math.round(originalWidth)} × {Math.round(originalHeight)}
            </span>
          </div>
        </div>
      </Section>
    </div>
  );
};
