import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";
import type { RendererPageView } from "./page-view";

function lastView(renderer: ReturnType<typeof createMockRenderer>): RendererPageView {
  return vi.mocked(renderer.setPageView!).mock.calls.at(-1)![0];
}

async function setup() {
  const renderer = createMockRenderer();
  renderer.setPageView = vi.fn();
  renderer.getPageViewBounds = vi.fn().mockReturnValue(null);
  const engine = new EditxEngine({ renderer });
  await engine.scene.create({ width: 100, height: 80 });
  const first = engine.getActivePage()!;
  const second = engine.scene.addPage({ width: 200, height: 120 });
  engine.setActivePage(first);
  engine.editor.setPageViewMode("vertical-pages");
  return { engine, renderer, first, second };
}

describe("continuous page-view reconciliation", () => {
  it("sends ordered mixed-size descriptors for both axes", async () => {
    const { engine, renderer, first, second } = await setup();
    expect(lastView(renderer)).toEqual({
      mode: "vertical-pages",
      activePageId: first,
      pages: [
        { id: first, width: 100, height: 80 },
        { id: second, width: 200, height: 120 },
      ],
    });
    engine.editor.setPageViewMode("horizontal-pages");
    expect(lastView(renderer)).toEqual({
      mode: "horizontal-pages",
      activePageId: first,
      pages: [
        { id: first, width: 100, height: 80 },
        { id: second, width: 200, height: 120 },
      ],
    });
  });

  it("reconciles resize, reorder, add, remove, nested batches, undo, and redo immediately", async () => {
    const { engine, renderer, first, second } = await setup();
    engine.beginBatch();
    engine.beginBatch();
    engine.scene.resizePage(second, 240, 160);
    expect(lastView(renderer)).toMatchObject({
      pages: expect.arrayContaining([{ id: second, width: 240, height: 160 }]),
    });
    engine.endBatch();
    engine.endBatch();
    engine.scene.movePage(second, 0);
    expect(lastView(renderer).pages.map((page) => page.id)).toEqual([second, first]);
    const third = engine.scene.addPage({ width: 90, height: 70 });
    expect(lastView(renderer).pages.at(-1)?.id).toBe(third);
    engine.scene.removePage(second);
    expect(lastView(renderer).pages.some((page) => page.id === second)).toBe(false);
    engine.undo();
    expect(lastView(renderer).pages.some((page) => page.id === second)).toBe(true);
    engine.redo();
    expect(lastView(renderer).pages.some((page) => page.id === second)).toBe(false);
  });

  it("rebuilds descriptors after load without serializing the view mode", async () => {
    const { engine, renderer } = await setup();
    const serialized = engine.scene.saveToString();
    vi.mocked(renderer.setPageView!).mockClear();
    await engine.scene.loadFromString(serialized);
    expect(lastView(renderer)).toMatchObject({
      mode: "vertical-pages",
      activePageId: engine.getActivePage(),
    });
    expect(lastView(renderer).pages).toHaveLength(2);
    expect(engine.scene.saveToString()).toBe(serialized);
  });

  it("activation updates transient editing state without changing camera APIs", async () => {
    const { engine, renderer, second } = await setup();
    vi.mocked(renderer.panTo).mockClear();
    vi.mocked(renderer.fitToRect).mockClear();
    vi.mocked(renderer.fitToScreen).mockClear();
    engine.setActivePage(second);
    expect(lastView(renderer)).toMatchObject({ activePageId: second });
    expect(renderer.panTo).not.toHaveBeenCalled();
    expect(renderer.fitToRect).not.toHaveBeenCalled();
    expect(renderer.fitToScreen).not.toHaveBeenCalled();
  });
});
