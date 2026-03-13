import { useCallback } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import { IMAGE_SRC, IMAGE_ORIGINAL_WIDTH, IMAGE_ORIGINAL_HEIGHT } from '@creative-editor/engine';
import { useImageEditorStore } from '../store/image-editor-store';
import { useConfig } from '../config/config-context';

export interface UseImageToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_MAX_DIMENSION = 2048;

/** Read a File as a data URL, returning the string. */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Load an image element from a data URL and return it with natural dimensions. */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Downscale an image if either dimension exceeds maxDim.
 * Returns a new data URL (or the original if no downscale needed).
 */
function downscaleImage(img: HTMLImageElement, maxDim: number): string {
  const { naturalWidth: w, naturalHeight: h } = img;
  if (w <= maxDim && h <= maxDim) {
    return img.src;
  }

  const scale = maxDim / Math.max(w, h);
  const newW = Math.round(w * scale);
  const newH = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, newW, newH);
  return canvas.toDataURL('image/png');
}

export function useImageTool({ engineRef }: UseImageToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const config = useConfig();
  const imageConfig = config.image;

  const maxFileSize = imageConfig?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const maxDimension = imageConfig?.maxDimension ?? DEFAULT_MAX_DIMENSION;

  /**
   * Add an image overlay to the page from a File.
   * Validates size, downscales if needed, centers on page at ~40% size.
   */
  const handleAddImage = useCallback(async (file: File) => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    // Validate file size
    if (file.size > maxFileSize) {
      const maxMB = Math.round(maxFileSize / (1024 * 1024));
      throw new Error(`File size exceeds ${maxMB}MB limit`);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }

    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImageElement(dataUrl);

    // Downscale if exceeds max dimension
    const finalSrc = downscaleImage(img, maxDimension);
    const finalImg = finalSrc === img.src ? img : await loadImageElement(finalSrc);
    const naturalW = finalImg.naturalWidth;
    const naturalH = finalImg.naturalHeight;

    // Place on page at ~40% of the shortest side
    const pageW = ce.block.getFloat(editableBlockId, 'page/width') ?? 1080;
    const pageH = ce.block.getFloat(editableBlockId, 'page/height') ?? 1080;

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
      finalSrc,
      x, y,
      width, height,
      naturalW, naturalH,
    );
    ce.block.select(imageId);
  }, [engineRef, editableBlockId, maxFileSize, maxDimension]);

  /**
   * Replace the image source on the currently selected image block.
   */
  const handleReplaceImage = useCallback(async (file: File, blockId: number) => {
    const ce = engineRef.current;
    if (!ce) return;

    if (file.size > maxFileSize) {
      const maxMB = Math.round(maxFileSize / (1024 * 1024));
      throw new Error(`File size exceeds ${maxMB}MB limit`);
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }

    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImageElement(dataUrl);

    const finalSrc = downscaleImage(img, maxDimension);
    const finalImg = finalSrc === img.src ? img : await loadImageElement(finalSrc);

    ce.block.setString(blockId, IMAGE_SRC, finalSrc);
    ce.block.setFloat(blockId, IMAGE_ORIGINAL_WIDTH, finalImg.naturalWidth);
    ce.block.setFloat(blockId, IMAGE_ORIGINAL_HEIGHT, finalImg.naturalHeight);
  }, [engineRef, maxFileSize, maxDimension]);

  return { handleAddImage, handleReplaceImage };
}
