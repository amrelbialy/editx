import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import type { PageViewMode, RendererPageView } from "./index";
import { EditxEngine, PageViewError } from "./index";

function supportedEngine() {
  const renderer = createMockRenderer();
  renderer.setPageView = vi.fn();
  renderer.getPageViewBounds = vi.fn().mockReturnValue(null);
  return { engine: new EditxEngine({ renderer }), renderer };
}

describe("EditorAPI page view contract", () => {
  it("defaults to all-pages and supports all-pages without a renderer", () => {
    const engine = new EditxEngine();
    expect(engine.editor.getPageViewMode()).toBe("all-pages");
    expect(() => engine.editor.setPageViewMode("all-pages")).not.toThrow();
  });

  it("rejects active-page headless and on legacy adapters without changing mode", () => {
    const headless = new EditxEngine();
    expect(() => headless.editor.setPageViewMode("active-page")).toThrowError(
      expect.objectContaining({ code: "NO_RENDERER" }),
    );
    expect(headless.editor.getPageViewMode()).toBe("all-pages");

    const legacy = new EditxEngine({ renderer: createMockRenderer() });
    expect(() => legacy.editor.setPageViewMode("active-page")).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_RENDERER" }),
    );
    expect(() => legacy.editor.setPageViewMode("all-pages")).not.toThrow();
    expect(legacy.editor.getPageViewMode()).toBe("all-pages");
  });

  it("validates runtime input before changing renderer or mode", () => {
    const { engine, renderer } = supportedEngine();
    expect(() => engine.editor.setPageViewMode("one-page" as PageViewMode)).toThrow(TypeError);
    expect(renderer.setPageView).not.toHaveBeenCalled();
    expect(engine.editor.getPageViewMode()).toBe("all-pages");
  });

  it("passes adapter failures through and keeps the previous mode", () => {
    const { engine, renderer } = supportedEngine();
    vi.mocked(renderer.setPageView!).mockImplementation(() => {
      throw new Error("adapter contract");
    });
    expect(() => engine.editor.setPageViewMode("active-page")).toThrow("adapter contract");
    expect(engine.editor.getPageViewMode()).toBe("all-pages");
  });

  it("requires bounds support only for continuous modes", () => {
    const renderer = createMockRenderer();
    renderer.setPageView = vi.fn();
    const engine = new EditxEngine({ renderer });
    expect(() => engine.editor.setPageViewMode("active-page")).not.toThrow();
    expect(() => engine.editor.setPageViewMode("vertical-pages")).toThrowError(
      expect.objectContaining({ code: "UNSUPPORTED_RENDERER" }),
    );
    expect(engine.editor.getPageViewMode()).toBe("active-page");
  });

  it("returns renderer bounds and null for unavailable bounds", () => {
    const { engine, renderer } = supportedEngine();
    vi.mocked(renderer.getPageViewBounds!).mockReturnValue({
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    });
    expect(engine.editor.getPageViewBounds(7)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 80,
    });
    expect(new EditxEngine().editor.getPageViewBounds(7)).toBeNull();
  });

  it("keeps the last mode after disposal and rejects setters", () => {
    const { engine } = supportedEngine();
    engine.editor.setPageViewMode("active-page");
    engine.dispose();
    expect(engine.editor.getPageViewMode()).toBe("active-page");
    expect(() => engine.editor.setPageViewMode("all-pages")).toThrowError(
      expect.objectContaining({ code: "ENGINE_DISPOSED" }),
    );
  });

  it("exports the settled runtime and type surface from the barrel", () => {
    const code = new PageViewError("NO_RENDERER", "missing", { cause: "test" });
    const view: RendererPageView = { mode: "active-page", activePageId: null };
    expect(code).toMatchObject({ name: "PageViewError", code: "NO_RENDERER", cause: "test" });
    expect(view).toEqual({ mode: "active-page", activePageId: null });
  });
});

describe("page view remains transient", () => {
  it("does not mutate serialization, visibility, history, or block lifecycle events", async () => {
    const { engine } = supportedEngine();
    await engine.scene.create();
    const page = engine.scene.getCurrentPage()!;
    const events = vi.fn();
    engine.event.subscribe([], events);
    const before = engine.scene.saveToString();

    engine.editor.setPageViewMode("active-page");
    engine.editor.setPageViewMode("vertical-pages");
    engine.editor.setPageViewMode("horizontal-pages");
    engine.editor.setPageViewMode("all-pages");

    expect(engine.scene.saveToString()).toBe(before);
    expect(engine.block.isVisible(page)).toBe(true);
    expect(engine.canUndo()).toBe(false);
    expect(events).not.toHaveBeenCalled();
  });
});
