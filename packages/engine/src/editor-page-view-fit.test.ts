import { describe, expect, it, vi } from "vitest";
import { createMockRenderer } from "./__tests__/mocks/mock-renderer";
import { EditxEngine } from "./editx-engine";

async function setup() {
  const renderer = createMockRenderer();
  renderer.setPageView = vi.fn();
  renderer.getPageViewBounds = vi.fn();
  const engine = new EditxEngine({ renderer });
  await engine.scene.create({ width: 100, height: 80 });
  const first = engine.getActivePage()!;
  const second = engine.scene.addPage({ width: 200, height: 120 });
  engine.editor.setPageViewMode("vertical-pages");
  return { engine, renderer, first, second };
}

describe("continuous page fitting", () => {
  it("fits the active page's offset frame, including the last page", async () => {
    const { engine, renderer, second } = await setup();
    engine.setActivePage(second);
    vi.mocked(renderer.getPageViewBounds!).mockReturnValue({
      x: 0,
      y: 128,
      width: 200,
      height: 120,
    });
    engine.editor.fitToScreen(30, true);
    expect(renderer.fitToRect).toHaveBeenLastCalledWith(
      { x: 0, y: 128, width: 200, height: 120 },
      30,
      true,
    );
  });

  it("adds each selected block's owning page offset exactly once", async () => {
    const { engine, renderer, second } = await setup();
    const graphic = engine.block.create("graphic");
    engine.block.setPosition(graphic, 10, 15);
    engine.block.setSize(graphic, 40, 20);
    engine.block.appendChild(second, graphic);
    engine.block.select(graphic);
    vi.mocked(renderer.getPageViewBounds!).mockReturnValue({
      x: 0,
      y: 128,
      width: 200,
      height: 120,
    });
    engine.editor.fitToSelection(12);
    expect(renderer.fitToRect).toHaveBeenLastCalledWith(
      { x: 10, y: 143, width: 40, height: 20 },
      12,
      false,
    );
  });

  it("fits a rotated group child's full authored transform before adding the page frame", async () => {
    const { engine, renderer, second } = await setup();
    const group = engine.block.create("group");
    engine.block.appendChild(second, group);
    engine.block.setPosition(group, 100, 80);
    engine.block.setRotation(group, 90);
    const child = engine.block.create("graphic");
    engine.block.appendChild(group, child);
    engine.block.setPosition(child, 10, 20);
    engine.block.setSize(child, 40, 20);
    engine.block.enterGroup(group);
    engine.block.select(child);
    vi.mocked(renderer.getPageViewBounds!).mockReturnValue({
      x: 50,
      y: 128,
      width: 200,
      height: 120,
    });

    engine.editor.fitToSelection(12);

    expect(renderer.fitToRect).toHaveBeenLastCalledWith(
      {
        x: expect.closeTo(110, 6),
        y: expect.closeTo(218, 6),
        width: expect.closeTo(20, 6),
        height: expect.closeTo(40, 6),
      },
      12,
      false,
    );
  });

  it("uses rendered affine bounds for center-origin shapes without adding the page offset twice", async () => {
    const { engine, renderer, second } = await setup();
    const ellipse = engine.block.create("graphic");
    engine.block.appendChild(second, ellipse);
    engine.block.setShapeGeometry(ellipse, { type: "ellipse" });
    engine.block.setSize(ellipse, 100, 50);
    engine.block.setRotation(ellipse, 90);
    engine.block.select(ellipse);
    vi.mocked(renderer.getPageViewBounds!).mockReturnValue({
      x: 50,
      y: 128,
      width: 200,
      height: 120,
    });
    vi.mocked(renderer.getBlockScreenRect).mockReturnValue({
      x: 150,
      y: 206,
      width: 100,
      height: 200,
    });
    vi.mocked(renderer.screenToWorld).mockImplementation(({ x, y }) => ({ x: x / 2, y: y / 2 }));

    engine.editor.fitToSelection(12);

    expect(renderer.fitToRect).toHaveBeenLastCalledWith(
      { x: 75, y: 103, width: 50, height: 100 },
      12,
      false,
    );
  });
});
