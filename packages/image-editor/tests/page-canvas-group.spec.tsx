import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: nested rotated groups retain local coordinates through layout changes and dragging`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await focusPage(page, 1);
    const before = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const marker = engine.block.getChildren(ids[1])[0];
      const sibling = engine.block.addShape(ids[1], "rect", "color", 100, 40, 40, 40);
      const inner = engine.block.group([marker, sibling]);
      engine.block.setRotation(inner, 20);
      const outer = engine.block.group([inner]);
      engine.block.setRotation(outer, 15);
      engine.clearHistory();
      return {
        marker,
        inner,
        outer,
        position: engine.block.getPosition(outer),
        child: engine.block.getPosition(marker),
        nested: engine.block.getPosition(inner),
        saved: engine.scene.saveToString(),
      };
    });
    const geometry = await page.evaluate(async ({ marker }) => {
      const { engine, samplePixel } = window.__pageNavigationHarness!;
      const next =
        engine.editor.getPageViewMode() === "vertical-pages"
          ? "horizontal-pages"
          : "vertical-pages";
      engine.editor.setPageViewMode(next);
      engine.editor.fitToScreen();
      await samplePixel();
      const size = engine.block.getSize(marker);
      const position = engine.block.getPosition(marker);
      let point = { x: position.x + size.width / 2, y: position.y + size.height / 2 };
      let parent = engine.block.getParent(marker)!;
      while (engine.block.getType(parent) === "group") {
        const angle = (engine.block.getRotation(parent) * Math.PI) / 180;
        const origin = engine.block.getPosition(parent);
        point = {
          x: origin.x + point.x * Math.cos(angle) - point.y * Math.sin(angle),
          y: origin.y + point.x * Math.sin(angle) + point.y * Math.cos(angle),
        };
        parent = engine.block.getParent(parent)!;
      }
      const frame = engine.editor.getPageViewBounds(parent)!;
      return {
        rect: engine.editor.getBlockScreenRect(marker)!,
        center: engine.editor.worldToScreen({ x: frame.x + point.x, y: frame.y + point.y }),
        zoom: engine.editor.getZoom(),
        saved: engine.scene.saveToString(),
        undo: engine.canUndo(),
      };
    }, before);
    expect(geometry.saved).toBe(before.saved);
    expect(geometry.undo).toBe(false);
    expect(geometry.rect.x + geometry.rect.width / 2).toBeCloseTo(geometry.center.x, 4);
    expect(geometry.rect.y + geometry.rect.height / 2).toBeCloseTo(geometry.center.y, 4);
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    const x = canvas.x + geometry.center.x;
    const y = canvas.y + geometry.center.y;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y + 20, { steps: 8 });
    await page.mouse.up();
    const after = await page.evaluate(({ outer, inner, marker }) => {
      const { engine, ids } = window.__pageNavigationHarness!;
      return {
        position: engine.block.getPosition(outer),
        child: engine.block.getPosition(marker),
        nested: engine.block.getPosition(inner),
        page: engine.block.getPosition(ids[1]),
        rotation: engine.block.getRotation(outer),
        nestedRotation: engine.block.getRotation(inner),
        undo: engine.canUndo(),
      };
    }, before);
    expect(Math.abs(after.position.x - before.position.x - 30 / geometry.zoom)).toBeLessThanOrEqual(
      1 / geometry.zoom,
    );
    expect(Math.abs(after.position.y - before.position.y - 20 / geometry.zoom)).toBeLessThanOrEqual(
      1 / geometry.zoom,
    );
    expect(after.child).toEqual(before.child);
    expect(after.nested).toEqual(before.nested);
    expect(after.page).toEqual({ x: 0, y: 0 });
    expect(after.rotation).toBe(15);
    expect(after.nestedRotation).toBe(20);
    expect(after.undo).toBe(true);
    expect(
      await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        engine.undo();
        return { saved: engine.scene.saveToString(), undo: engine.canUndo() };
      }),
    ).toEqual({ saved: before.saved, undo: false });
  });
}
