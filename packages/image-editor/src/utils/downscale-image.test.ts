/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it, vi } from "vitest";
import { downscaleIfNeeded } from "./downscale-image";

/** Create a mock HTMLImageElement with the given natural dimensions. */
function mockImage(
  naturalWidth: number,
  naturalHeight: number,
  src = "https://example.com/img.png",
): HTMLImageElement {
  const img = {
    naturalWidth,
    naturalHeight,
    src,
  } as HTMLImageElement;
  return img;
}

describe("downscaleIfNeeded", () => {
  it("returns original data for images under the megapixel budget", () => {
    const img = mockImage(1920, 1080); // ~2 MP
    const result = downscaleIfNeeded(img);

    expect(result.wasDownscaled).toBe(false);
    expect(result.workingWidth).toBe(1920);
    expect(result.workingHeight).toBe(1080);
    expect(result.originalWidth).toBe(1920);
    expect(result.originalHeight).toBe(1080);
    expect(result.dataUrl).toBe(img.src);
  });

  it("returns original data for images exactly at the budget", () => {
    // 5000 × 5000 = 25 MP (exactly at default budget)
    const img = mockImage(5000, 5000);
    const result = downscaleIfNeeded(img);

    expect(result.wasDownscaled).toBe(false);
    expect(result.workingWidth).toBe(5000);
    expect(result.workingHeight).toBe(5000);
  });

  it("downscales images exceeding the megapixel budget", () => {
    // 8000 × 6000 = 48 MP, well above 25 MP
    const img = mockImage(8000, 6000);

    // Mock canvas + context for downscaling
    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,downscaled"),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockCanvas as any);

    const result = downscaleIfNeeded(img);

    expect(result.wasDownscaled).toBe(true);
    expect(result.originalWidth).toBe(8000);
    expect(result.originalHeight).toBe(6000);
    // Working dims should be smaller than original
    expect(result.workingWidth).toBeLessThan(8000);
    expect(result.workingHeight).toBeLessThan(6000);
    // Aspect ratio preserved
    const originalRatio = 8000 / 6000;
    const workingRatio = result.workingWidth / result.workingHeight;
    expect(Math.abs(originalRatio - workingRatio)).toBeLessThan(0.01);
    expect(result.dataUrl).toBe("data:image/png;base64,downscaled");
  });

  it("uses custom maxMegapixels parameter", () => {
    // 2000 × 2000 = 4 MP
    const img = mockImage(2000, 2000);

    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,small"),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockCanvas as any);

    const result = downscaleIfNeeded(img, 2); // 2 MP budget

    expect(result.wasDownscaled).toBe(true);
    expect(result.workingWidth).toBeLessThan(2000);
    expect(result.workingHeight).toBeLessThan(2000);
  });

  it("preserves original dimensions in the result when downscaling", () => {
    const img = mockImage(10000, 8000);

    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,x"),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockCanvas as any);

    const result = downscaleIfNeeded(img);

    expect(result.originalWidth).toBe(10000);
    expect(result.originalHeight).toBe(8000);
    expect(result.workingWidth).not.toBe(10000);
  });

  it("logs a warning when downscaling", () => {
    const img = mockImage(8000, 6000);

    const mockCtx = { drawImage: vi.fn() };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toDataURL: vi.fn().mockReturnValue("data:image/png;base64,x"),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockCanvas as any);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    downscaleIfNeeded(img);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("Downscaling"));
    warnSpy.mockRestore();
  });
});
