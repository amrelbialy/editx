import type { ImageSource } from "../../image-editor";
import { sourceToUrl } from "../../utils/load-image";

/**
 * Convert any supported source type to a URL string.
 */
export function resolveSourceToUrl(source: ImageSource): string {
  if (typeof source === "string") return sourceToUrl(source);
  if (source instanceof File || source instanceof Blob) return sourceToUrl(source);
  if (source instanceof HTMLCanvasElement) return source.toDataURL();
  if (source instanceof HTMLImageElement) return source.src;
  return sourceToUrl(source as string);
}

/**
 * For HTMLImageElement sources that may not yet be loaded, wait for the load event.
 */
export function ensureImageReady(source: ImageSource): Promise<void> {
  if (source instanceof HTMLImageElement && !source.complete) {
    return new Promise((resolve, reject) => {
      source.addEventListener("load", () => resolve(), { once: true });
      source.addEventListener("error", () => reject(new Error("HTMLImageElement failed to load")), {
        once: true,
      });
    });
  }
  return Promise.resolve();
}

/**
 * Extract the raw URL string from a source for identity comparison.
 * Does NOT create blob URLs — purely reads existing URLs.
 */
export function getSourceIdentity(source: ImageSource): string | null {
  if (typeof source === "string") return source;
  if (source instanceof HTMLImageElement) return source.src || null;
  return null;
}
