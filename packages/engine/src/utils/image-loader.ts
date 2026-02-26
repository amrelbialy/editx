const imageCache = new Map<string, HTMLImageElement>();

/**
 * Load an image from a URL with caching.
 * Subsequent calls with the same `src` return the cached element.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

/** Remove a single entry from the image cache (e.g. after revoking a blob URL). */
export function evictImage(src: string): void {
  imageCache.delete(src);
}

/** Clear the entire image cache. Called by engine dispose. */
export function clearImageCache(): void {
  imageCache.clear();
}

/** Convert a string URL, File, or Blob to a usable URL string. */
export function sourceToUrl(source: string | File | Blob): string {
  if (typeof source === 'string') return source;
  return URL.createObjectURL(source);
}

/** Revoke a blob URL if it was created by `sourceToUrl`. */
export function revokeObjectUrl(url: string): void {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
