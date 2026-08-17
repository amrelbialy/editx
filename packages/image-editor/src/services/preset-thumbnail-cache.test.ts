import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresetThumbnailCache } from "./preset-thumbnail-cache";

describe("PresetThumbnailCache", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:thumbnail"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("deduplicates concurrent renders for the same preset", async () => {
    const cache = new PresetThumbnailCache();
    const create = vi.fn(async () => new Blob(["png"]));

    const [first, second] = await Promise.all([
      cache.get("preset", create),
      cache.get("preset", create),
    ]);

    expect(first).toBe("blob:thumbnail");
    expect(second).toBe(first);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("allows a failed render to be retried", async () => {
    const cache = new PresetThumbnailCache();
    const create = vi
      .fn<() => Promise<Blob>>()
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce(new Blob(["png"]));

    await expect(cache.get("preset", create)).rejects.toThrow("failed");
    await expect(cache.get("preset", create)).resolves.toBe("blob:thumbnail");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("revokes generated URLs when disposed", async () => {
    const cache = new PresetThumbnailCache();
    await cache.get("preset", async () => new Blob(["png"]));

    cache.dispose();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:thumbnail");
  });

  it("does not create a URL when an in-flight render resolves after disposal", async () => {
    const cache = new PresetThumbnailCache();
    let resolveBlob: ((blob: Blob) => void) | undefined;
    const pending = cache.get(
      "preset",
      () =>
        new Promise((resolve) => {
          resolveBlob = resolve;
        }),
    );

    cache.dispose();
    resolveBlob?.(new Blob(["png"]));

    await expect(pending).rejects.toThrow("disposed");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("rejects new work after disposal", async () => {
    const cache = new PresetThumbnailCache();
    const create = vi.fn(async () => new Blob(["png"]));
    cache.dispose();

    await expect(cache.get("preset", create)).rejects.toThrow("disposed");
    expect(create).not.toHaveBeenCalled();
  });
});
