import type { Page } from "@playwright/test";

/**
 * Shared test utilities for reading the *actual* exported raster produced by
 * the editor. The engine encodes exports via `HTMLCanvasElement.toDataURL`, so
 * we monkeypatch that method in-browser and record every produced data URL.
 *
 * This lets specs assert concrete state (pixel means, dimensions) rather than
 * merely "an onSave blob was non-null". Blobs do not round-trip cleanly across
 * the Playwright component-test Node boundary, so all decoding happens in-page.
 */

interface ExportWindow {
  __exports?: string[];
}

/** Aggregate statistics of a decoded export raster. */
export interface ExportStats {
  width: number;
  height: number;
  /** Mean red/green/blue channel value across every pixel (0-255). */
  meanR: number;
  meanG: number;
  meanB: number;
  /** Count of pixels with a non-zero alpha channel. */
  opaquePixels: number;
}

/**
 * Install the in-browser capture hook. Call once after the editor has mounted.
 * Records every `data:image/*` URL produced by `toDataURL`.
 */
export async function installExportCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const proto = HTMLCanvasElement.prototype;
    const win = window as unknown as ExportWindow;
    win.__exports = [];
    const original = proto.toDataURL;
    proto.toDataURL = function patched(this: HTMLCanvasElement, ...args: unknown[]) {
      const url = (original as (...a: unknown[]) => string).apply(this, args);
      if (typeof url === "string" && url.startsWith("data:image/")) {
        (window as unknown as ExportWindow).__exports?.push(url);
      }
      return url;
    } as typeof proto.toDataURL;
  });
}

/** Drop all previously captured exports so the next read is unambiguous. */
export async function resetExportCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as ExportWindow).__exports = [];
  });
}

/**
 * Decode every captured export and return the statistics of the *largest* one
 * (by pixel area). Preview thumbnails share the same `toDataURL` hook, so
 * picking the largest raster reliably selects the full-resolution export.
 */
export async function readLargestExportStats(page: Page): Promise<ExportStats | null> {
  return page.evaluate(async () => {
    const urls = (window as unknown as ExportWindow).__exports ?? [];
    if (urls.length === 0) return null;

    let best: ExportStats | null = null;
    for (const url of urls) {
      const img = new Image();
      const ok = await new Promise<boolean>((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });
      if (!ok) continue;

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      let r = 0;
      let g = 0;
      let b = 0;
      let opaque = 0;
      const pixels = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        if (data[i + 3] > 0) opaque++;
      }

      const stats: ExportStats = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        meanR: r / pixels,
        meanG: g / pixels,
        meanB: b / pixels,
        opaquePixels: opaque,
      };
      const area = stats.width * stats.height;
      if (!best || area > best.width * best.height) best = stats;
    }
    return best;
  });
}

/** Euclidean distance between the mean colors of two exports (0-441). */
export function meanColorDistance(a: ExportStats, b: ExportStats): number {
  return Math.sqrt(
    (a.meanR - b.meanR) ** 2 + (a.meanG - b.meanG) ** 2 + (a.meanB - b.meanB) ** 2,
  );
}
