/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearImageCache,
  evictImage,
  loadImage,
  revokeObjectUrl,
  sourceToUrl,
} from "./image-loader";

/** A mock Image class whose `src` setter triggers `onload` asynchronously. */
class SuccessImage {
  crossOrigin = "";
  private _src = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  get src() {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    // Simulate async load success
    setTimeout(() => this.onload?.(), 0);
  }
}

/** A mock Image class whose `src` setter triggers `onerror` asynchronously. */
class FailImage {
  crossOrigin = "";
  private _src = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  get src() {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    setTimeout(() => this.onerror?.(), 0);
  }
}

/**
 * A mock Image class that fails on the first attempt (with crossOrigin set)
 * but succeeds on the second attempt (CORS fallback without crossOrigin).
 */
let corsFallbackCallCount = 0;
class CORSFallbackImage {
  crossOrigin = "";
  private _src = "";
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  get src() {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    corsFallbackCallCount++;
    if (this.crossOrigin === "anonymous") {
      // First attempt with CORS → fail
      setTimeout(() => this.onerror?.(), 0);
    } else {
      // Retry without CORS → succeed
      setTimeout(() => this.onload?.(), 0);
    }
  }
}

describe("image-loader", () => {
  let originalImage: typeof globalThis.Image;

  beforeEach(() => {
    originalImage = globalThis.Image;
    // Default: images load successfully
    globalThis.Image = SuccessImage as any;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    clearImageCache();
    vi.restoreAllMocks();
  });

  describe("loadImage", () => {
    it("resolves with the mock image", async () => {
      const img = await loadImage("https://example.com/test.png");
      expect(img).toBeDefined();
      expect(img.src).toBe("https://example.com/test.png");
    });

    it("caches the result on subsequent calls", async () => {
      const img1 = await loadImage("https://example.com/cached.png");
      const img2 = await loadImage("https://example.com/cached.png");
      expect(img1).toBe(img2);
    });

    it("sets crossOrigin to anonymous", async () => {
      const img = await loadImage("https://example.com/cors.png");
      expect(img.crossOrigin).toBe("anonymous");
    });

    it("rejects when image fails to load", async () => {
      globalThis.Image = FailImage as any;

      await expect(loadImage("https://example.com/fail.png")).rejects.toThrow(
        "Failed to load image",
      );
    });

    it("retries without crossOrigin on CORS failure (fallback)", async () => {
      corsFallbackCallCount = 0;
      globalThis.Image = CORSFallbackImage as any;

      const img = await loadImage("https://example.com/cors-fail.png");
      expect(img).toBeDefined();
      expect(img.src).toBe("https://example.com/cors-fail.png");
      // Should have been called twice: once with CORS, once without
      expect(corsFallbackCallCount).toBe(2);
    });

    it("CORS fallback image has no crossOrigin attribute", async () => {
      corsFallbackCallCount = 0;
      globalThis.Image = CORSFallbackImage as any;

      const img = await loadImage("https://example.com/cors-no-attr.png");
      // The fallback image should NOT have crossOrigin set
      expect(img.crossOrigin).toBe("");
    });

    it("CORS fallback logs a console warning", async () => {
      corsFallbackCallCount = 0;
      globalThis.Image = CORSFallbackImage as any;
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await loadImage("https://example.com/cors-warn.png");

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("without CORS headers"));
      warnSpy.mockRestore();
    });
  });

  describe("evictImage", () => {
    it("removes an entry from the cache", async () => {
      const img1 = await loadImage("https://example.com/evict.png");
      evictImage("https://example.com/evict.png");
      const img2 = await loadImage("https://example.com/evict.png");
      // After eviction, a new Image should be created
      expect(img2).not.toBe(img1);
    });
  });

  describe("clearImageCache", () => {
    it("clears all cached images", async () => {
      const img1 = await loadImage("https://example.com/a.png");
      await loadImage("https://example.com/b.png");
      clearImageCache();
      const img1b = await loadImage("https://example.com/a.png");
      expect(img1b).not.toBe(img1);
    });
  });

  describe("sourceToUrl", () => {
    it("returns string sources as-is", () => {
      expect(sourceToUrl("https://example.com/img.png")).toBe("https://example.com/img.png");
    });

    it("creates object URL for Blob", () => {
      const blob = new Blob(["test"], { type: "image/png" });
      const url = sourceToUrl(blob);
      expect(url).toContain("blob:");
    });

    it("creates object URL for File", () => {
      const file = new File(["test"], "image.png", { type: "image/png" });
      const url = sourceToUrl(file);
      expect(url).toContain("blob:");
    });
  });

  describe("revokeObjectUrl", () => {
    it("revokes blob URLs", () => {
      const spy = vi.spyOn(URL, "revokeObjectURL");
      revokeObjectUrl("blob:http://localhost/abc");
      expect(spy).toHaveBeenCalledWith("blob:http://localhost/abc");
    });

    it("does not revoke non-blob URLs", () => {
      const spy = vi.spyOn(URL, "revokeObjectURL");
      revokeObjectUrl("https://example.com/img.png");
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
