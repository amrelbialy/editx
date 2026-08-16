import type { EditxEngine } from "@editx/engine";
import { IMAGE_ORIGINAL_HEIGHT, IMAGE_ORIGINAL_WIDTH, IMAGE_SRC } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { Section } from "../ui/section";
import { ImagePicker } from "./image-picker.component";

interface ImageFillPanelProps {
  engine: EditxEngine;
  blockId: number;
  onReplace: (file: File) => Promise<void> | void;
}

export const ImageFillPanel: React.FC<ImageFillPanelProps> = ({ engine, blockId, onReplace }) => {
  const [imageSrc, setImageSrc] = useState("");
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [blockWidth, setBlockWidth] = useState(0);
  const [blockHeight, setBlockHeight] = useState(0);

  const refresh = useCallback(() => {
    setImageSrc(engine.block.getString(blockId, IMAGE_SRC));
    setOriginalWidth(engine.block.getFloat(blockId, IMAGE_ORIGINAL_WIDTH));
    setOriginalHeight(engine.block.getFloat(blockId, IMAGE_ORIGINAL_HEIGHT));
    const { width: w, height: h } = engine.block.getSize(blockId);
    setBlockWidth(Math.round(w));
    setBlockHeight(Math.round(h));
  }, [engine, blockId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(refresh);
  }, [engine, refresh]);

  const handleReplace = useCallback(
    async (file: File) => {
      await onReplace(file);
      refresh();
    },
    [onReplace, refresh],
  );

  return (
    <div className="flex flex-col gap-3 p-1">
      <ImagePicker src={imageSrc} onSelect={handleReplace} />

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
