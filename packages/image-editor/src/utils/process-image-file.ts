import type { ImageToolConfig } from "../config/config.types";
import { formatBytes } from "./validate-image";

export interface ProcessedImage {
  src: string;
  width: number;
  height: number;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 2048;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = src;
  });
}

function downscaleImage(image: HTMLImageElement, maxDimension: number): string {
  const { naturalWidth: width, naturalHeight: height } = image;
  if (width <= maxDimension && height <= maxDimension) return image.src;

  const scale = maxDimension / Math.max(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Failed to process image");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export async function processImageFile(
  file: File,
  config: ImageToolConfig = {},
): Promise<ProcessedImage> {
  const maxFileSize = config.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const maxDimension = config.maxDimension ?? DEFAULT_MAX_DIMENSION;

  if (file.size > maxFileSize) {
    throw new Error(
      `Image is too large (${formatBytes(file.size)}). Maximum size: ${formatBytes(maxFileSize)}`,
    );
  }
  if (!file.type.startsWith("image/")) throw new Error("File is not an image");

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageElement(dataUrl);
  const src = downscaleImage(image, maxDimension);
  const finalImage = src === image.src ? image : await loadImageElement(src);

  return {
    src,
    width: finalImage.naturalWidth,
    height: finalImage.naturalHeight,
  };
}
