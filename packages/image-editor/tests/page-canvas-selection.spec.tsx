import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: fits a rotated center-origin shape inside a rotated group on an offset page`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await focusPage(page, 1);
    const ellipse = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const block = engine.block.addShape(ids[1], "ellipse", "color", 0, 0, 100, 50);
      const group = engine.block.group([block]);
      engine.block.setPosition(group, 100, 140);
      engine.block.setRotation(group, 90);
      engine.block.setRotation(block, 90);
      engine.block.select(block);
      engine.clearHistory();
      return block;
    });
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const before = await page.evaluate((block) => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const rect = engine.editor.getBlockScreenRect(block)!;
      const origin = engine.editor.screenToWorld(rect);
      const end = engine.editor.screenToWorld({
        x: rect.x + rect.width,
        y: rect.y + rect.height,
      });
      return {
        bounds: { ...origin, width: end.x - origin.x, height: end.y - origin.y },
        frame: engine.editor.getPageViewBounds(ids[1])!,
        saved: engine.scene.saveToString(),
      };
    }, ellipse);
    expect(before.bounds.x).toBeCloseTo(before.frame.x + 25, 5);
    expect(before.bounds.y).toBeCloseTo(before.frame.y + 165, 5);
    expect(before.bounds.width).toBeCloseTo(100, 5);
    expect(before.bounds.height).toBeCloseTo(50, 5);

    await page.evaluate(() => window.__pageNavigationHarness!.engine.editor.fitToSelection(24));
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const fitted = await page.evaluate((block) => {
      const { engine } = window.__pageNavigationHarness!;
      const rect = engine.editor.getBlockScreenRect(block)!;
      const viewport = document.querySelector(".konvajs-content")!.getBoundingClientRect();
      return {
        center: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
        viewport: { width: viewport.width, height: viewport.height },
        saved: engine.scene.saveToString(),
        undo: engine.canUndo(),
      };
    }, ellipse);
    expect(fitted.center.x).toBeCloseTo(fitted.viewport.width / 2, 5);
    expect(fitted.center.y).toBeCloseTo(fitted.viewport.height / 2, 5);
    expect(fitted.saved).toBe(before.saved);
    expect(fitted.undo).toBe(false);
  });
}
