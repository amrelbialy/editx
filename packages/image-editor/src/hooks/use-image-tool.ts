import type { EditxEngine } from "@editx/engine";
import { IMAGE_ORIGINAL_HEIGHT, IMAGE_ORIGINAL_WIDTH, IMAGE_SRC } from "@editx/engine";
import { useCallback } from "react";
import type { ImageToolConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { processImageFile } from "../utils/process-image-file";

export interface UseImageToolOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  /**
   * Image-tool config. Passed explicitly (not via context) because `useTools`
   * runs above the config provider in the editor tree.
   */
  imageConfig?: ImageToolConfig;
}

export function useImageTool({ engineRef, imageConfig }: UseImageToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  /**
   * Add an image overlay to the page from a File.
   * Validates size, downscales if needed, centers on page at ~40% size.
   */
  const handleAddImage = useCallback(
    async (file: File) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;

      const processed = await processImageFile(file, imageConfig);
      const naturalW = processed.width;
      const naturalH = processed.height;

      // Place on page at ~40% of the shortest side
      const { width: pageW, height: pageH } = ce.block.getPageDimensions(editableBlockId);

      const targetSize = Math.min(pageW, pageH) * 0.4;
      const aspect = naturalW / naturalH;
      let width: number, height: number;
      if (aspect >= 1) {
        width = targetSize;
        height = targetSize / aspect;
      } else {
        height = targetSize;
        width = targetSize * aspect;
      }

      const x = (pageW - width) / 2;
      const y = (pageH - height) / 2;

      const imageId = ce.block.addImage(
        editableBlockId,
        processed.src,
        x,
        y,
        width,
        height,
        naturalW,
        naturalH,
      );
      ce.block.select(imageId);
    },
    [engineRef, editableBlockId, imageConfig],
  );

  /**
   * Replace the image source on the currently selected image block.
   */
  const handleReplaceImage = useCallback(
    async (file: File, blockId: number) => {
      const ce = engineRef.current;
      if (!ce) return;

      const processed = await processImageFile(file, imageConfig);

      ce.beginBatch();
      ce.block.setString(blockId, IMAGE_SRC, processed.src);
      ce.block.setFloat(blockId, IMAGE_ORIGINAL_WIDTH, processed.width);
      ce.block.setFloat(blockId, IMAGE_ORIGINAL_HEIGHT, processed.height);
      ce.endBatch();
    },
    [engineRef, imageConfig],
  );

  return { handleAddImage, handleReplaceImage };
}
