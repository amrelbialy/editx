import type { ImageSource } from "../image-editor";

/**
 * Extract a human-readable filename (without extension) from an image source.
 *
 * | Source type          | Strategy                                              |
 * |----------------------|-------------------------------------------------------|
 * | `string` (URL)       | Last path segment, strip extension                    |
 * | `File`               | `file.name`, strip extension                          |
 * | `Blob`               | `'image'`                                             |
 * | `HTMLImageElement`   | `.name` if set, else extract from `.src`               |
 * | `HTMLCanvasElement`  | `'canvas'`                                             |
 */
export function extractFilename(source: ImageSource): string {
  if (typeof source === "string") {
    return filenameFromUrl(source);
  }

  if (source instanceof File) {
    return stripExtension(source.name) || "image";
  }

  if (source instanceof Blob) {
    return "image";
  }

  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    if (source.name) return stripExtension(source.name);
    if (source.src) return filenameFromUrl(source.src);
    return "image";
  }

  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return "canvas";
  }

  return "image";
}

/** Extract a filename from a URL string, stripping query/hash and extension. */
function filenameFromUrl(url: string): string {
  try {
    // Handle data URLs
    if (url.startsWith("data:")) return "image";
    // Handle blob URLs
    if (url.startsWith("blob:")) return "image";

    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop() || "image";
    return stripExtension(decodeURIComponent(lastSegment));
  } catch {
    // If URL parsing fails, try a simple split
    const parts = url.split("/").filter(Boolean);
    const last = parts.pop() || "image";
    // Strip query string
    const clean = last.split("?")[0].split("#")[0];
    return stripExtension(decodeURIComponent(clean)) || "image";
  }
}

function stripExtension(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  if (dotIdx > 0) return name.slice(0, dotIdx);
  return name;
}
