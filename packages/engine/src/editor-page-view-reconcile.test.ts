import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";
import type { RendererPageView } from "./page-view";

async function setup() {
  const renderer = createMockRenderer();
  renderer.setPageView = vi.fn();
  const engine = new EditxEngine({ renderer });
  await engine.scene.create({ width: 100, height: 80 });
  const first = engine.getActivePage()!;
  const second = engine.scene.addPage({ width: 200, height: 160 });
  engine.editor.setPageViewMode("active-page");
  vi.mocked(renderer.setPageView).mockClear();
  return { engine, renderer, first, second };
}

function lastView(renderer: ReturnType<typeof createMockRenderer>): RendererPageView | undefined {
  return vi.mocked(renderer.setPageView!).mock.calls.at(-1)?.[0];
}

describe("synchronous page-view reconciliation", () => {
  it("reconciles direct navigation immediately", async () => {
    const { engine, renderer, first } = await setup();
    engine.setActivePage(first);
    expect(lastView(renderer)).toEqual({ mode: "active-page", activePageId: first });
  });

  it("reconciles silent commands and every command inside nested batches", async () => {
    const { engine, renderer, first } = await setup();
    engine.setActivePage(first);
    vi.mocked(renderer.setPageView!).mockClear();

    engine.beginSilent();
    engine.beginBatch();
    engine.beginBatch();
    engine.block.setName(first, "silent");
    expect(renderer.setPageView).toHaveBeenCalled();
    engine.endBatch();
    engine.endBatch();
    engine.endSilent();

    expect(lastView(renderer)).toEqual({ mode: "active-page", activePageId: first });
  });

  it("reconciles removal, undo, and redo to the settled active page", async () => {
    const { engine, renderer, first, second } = await setup();
    engine.scene.removePage(second);
    expect(lastView(renderer)).toEqual({ mode: "active-page", activePageId: first });
    engine.undo();
    expect(lastView(renderer)).toEqual({ mode: "active-page", activePageId: second });
    engine.redo();
    expect(lastView(renderer)).toEqual({ mode: "active-page", activePageId: first });
  });

  it("reapplies isolation after loading and renderer scene replacement", async () => {
    const { engine, renderer } = await setup();
    const saved = engine.scene.saveToString();
    vi.mocked(renderer.setPageView!).mockClear();

    await engine.scene.loadFromString(saved);

    expect(renderer.createScene).toHaveBeenCalled();
    expect(lastView(renderer)).toEqual({
      mode: "active-page",
      activePageId: engine.getActivePage(),
    });
  });
});
