/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { loadImage, evictImage, clearImageCache, sourceToUrl, revokeObjectUrl } from './image-loader';

/** A mock Image class whose `src` setter triggers `onload` asynchronously. */
class SuccessImage {
  crossOrigin = '';
  private _src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  get src() { return this._src; }
  set src(value: string) {
    this._src = value;
    // Simulate async load success
    setTimeout(() => this.onload?.(), 0);
  }
}

/** A mock Image class whose `src` setter triggers `onerror` asynchronously. */
class FailImage {
  crossOrigin = '';
  private _src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  get src() { return this._src; }
  set src(value: string) {
    this._src = value;
    setTimeout(() => this.onerror?.(), 0);
  }
}

describe('image-loader', () => {
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

  describe('loadImage', () => {
    it('resolves with the mock image', async () => {
      const img = await loadImage('https://example.com/test.png');
      expect(img).toBeDefined();
      expect(img.src).toBe('https://example.com/test.png');
    });

    it('caches the result on subsequent calls', async () => {
      const img1 = await loadImage('https://example.com/cached.png');
      const img2 = await loadImage('https://example.com/cached.png');
      expect(img1).toBe(img2);
    });

    it('sets crossOrigin to anonymous', async () => {
      const img = await loadImage('https://example.com/cors.png');
      expect(img.crossOrigin).toBe('anonymous');
    });

    it('rejects when image fails to load', async () => {
      globalThis.Image = FailImage as any;

      await expect(loadImage('https://example.com/fail.png')).rejects.toThrow(
        'Failed to load image'
      );
    });
  });

  describe('evictImage', () => {
    it('removes an entry from the cache', async () => {
      const img1 = await loadImage('https://example.com/evict.png');
      evictImage('https://example.com/evict.png');
      const img2 = await loadImage('https://example.com/evict.png');
      // After eviction, a new Image should be created
      expect(img2).not.toBe(img1);
    });
  });

  describe('clearImageCache', () => {
    it('clears all cached images', async () => {
      const img1 = await loadImage('https://example.com/a.png');
      await loadImage('https://example.com/b.png');
      clearImageCache();
      const img1b = await loadImage('https://example.com/a.png');
      expect(img1b).not.toBe(img1);
    });
  });

  describe('sourceToUrl', () => {
    it('returns string sources as-is', () => {
      expect(sourceToUrl('https://example.com/img.png')).toBe('https://example.com/img.png');
    });

    it('creates object URL for Blob', () => {
      const blob = new Blob(['test'], { type: 'image/png' });
      const url = sourceToUrl(blob);
      expect(url).toContain('blob:');
    });

    it('creates object URL for File', () => {
      const file = new File(['test'], 'image.png', { type: 'image/png' });
      const url = sourceToUrl(file);
      expect(url).toContain('blob:');
    });
  });

  describe('revokeObjectUrl', () => {
    it('revokes blob URLs', () => {
      const spy = vi.spyOn(URL, 'revokeObjectURL');
      revokeObjectUrl('blob:http://localhost/abc');
      expect(spy).toHaveBeenCalledWith('blob:http://localhost/abc');
    });

    it('does not revoke non-blob URLs', () => {
      const spy = vi.spyOn(URL, 'revokeObjectURL');
      revokeObjectUrl('https://example.com/img.png');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
