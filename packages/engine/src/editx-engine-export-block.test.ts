import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

describe("EditxEngine.exportBlock", () => {
  it("delegates supported blocks with normalized defaults", async () => {
    const renderer = createMockRenderer();
    const engine = new EditxEngine({ renderer });
    const blockId = engine.block.create("graphic");
    const expected = new Blob([], { type: "image/png" });
    vi.mocked(renderer.exportBlock).mockResolvedValue(expected);

    await expect(engine.exportBlock(blockId, { width: 160, height: 90 })).resolves.toBe(expected);
    expect(renderer.exportBlock).toHaveBeenCalledWith(blockId, {
      width: 160,
      height: 90,
      padding: 0,
      pixelRatio: 1,
    });
  });

  it.each([
    [{ width: 0, height: 90 }, "width"],
    [{ width: 160, height: 1, padding: 1 }, "padding"],
    [{ width: 160, height: 90, pixelRatio: 0 }, "pixelRatio"],
  ])("rejects invalid options %o", async (options, message) => {
    const renderer = createMockRenderer();
    const engine = new EditxEngine({ renderer });
    const blockId = engine.block.create("text");

    await expect(engine.exportBlock(blockId, options)).rejects.toThrow(message);
    expect(renderer.exportBlock).not.toHaveBeenCalled();
  });

  it("rejects missing and unsupported blocks", async () => {
    const renderer = createMockRenderer();
    const engine = new EditxEngine({ renderer });
    const pageId = engine.block.create("page");
    const options = { width: 160, height: 90 };

    await expect(engine.exportBlock(999, options)).rejects.toThrow("does not exist");
    await expect(engine.exportBlock(pageId, options)).rejects.toThrow("unsupported block type");
  });
});
