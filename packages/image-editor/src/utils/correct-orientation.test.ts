/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { correctOrientation } from './correct-orientation';

describe('correctOrientation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a canvas with correct dimensions', async () => {
    // Mock createImageBitmap
    const mockBitmap = {
      width: 800,
      height: 600,
      close: vi.fn(),
    };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    // Mock canvas
    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
    };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    const result = await correctOrientation(blob);

    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.canvas).toBe(mockCanvas);
  });

  it('calls createImageBitmap with orientation correction', async () => {
    const mockBitmap = { width: 100, height: 100, close: vi.fn() };
    const mockCreateImageBitmap = vi.fn().mockResolvedValue(mockBitmap);
    vi.stubGlobal('createImageBitmap', mockCreateImageBitmap);

    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(mockCtx) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    const blob = new Blob(['data'], { type: 'image/jpeg' });
    await correctOrientation(blob);

    expect(mockCreateImageBitmap).toHaveBeenCalledWith(blob, {
      imageOrientation: 'from-image',
    });
  });

  it('draws the bitmap onto the canvas', async () => {
    const mockBitmap = { width: 400, height: 300, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(mockCtx) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    const blob = new Blob(['data'], { type: 'image/jpeg' });
    await correctOrientation(blob);

    expect(mockCtx.drawImage).toHaveBeenCalledWith(mockBitmap, 0, 0);
  });

  it('closes the ImageBitmap after drawing', async () => {
    const mockBitmap = { width: 200, height: 200, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(mockCtx) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    const blob = new Blob(['data'], { type: 'image/jpeg' });
    await correctOrientation(blob);

    expect(mockBitmap.close).toHaveBeenCalled();
  });

  it('sets canvas dimensions to match bitmap', async () => {
    const mockBitmap = { width: 1024, height: 768, close: vi.fn() };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = { width: 0, height: 0, getContext: vi.fn().mockReturnValue(mockCtx) };
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    const blob = new Blob(['data'], { type: 'image/jpeg' });
    await correctOrientation(blob);

    expect(mockCanvas.width).toBe(1024);
    expect(mockCanvas.height).toBe(768);
  });

  it('rejects if createImageBitmap fails', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('unsupported')));

    const blob = new Blob(['data'], { type: 'image/jpeg' });

    await expect(correctOrientation(blob)).rejects.toThrow('unsupported');
  });
});
