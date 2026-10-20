import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: initially fits the active page and preserves user zoom after resizing`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const initial = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const viewport = document.querySelector(".konvajs-content")!.getBoundingClientRect();
      const frame = engine.editor.getPageViewBounds(ids[0])!;
      const zoom = engine.editor.getZoom();
      return {
        zoom,
        expectedZoom: Math.min(
          (viewport.width - 96) / frame.width,
          (viewport.height - 96) / frame.height,
        ),
        center: engine.editor.worldToScreen({
          x: frame.x + frame.width / 2,
          y: frame.y + frame.height / 2,
        }),
        viewport: { width: viewport.width, height: viewport.height },
      };
    });
    expect(initial.zoom).toBeCloseTo(initial.expectedZoom, 5);
    expect(initial.center.x).toBeCloseTo(initial.viewport.width / 2, 5);
    expect(initial.center.y).toBeCloseTo(initial.viewport.height / 2, 5);
    await expect(component.getByRole("button", { name: "Zoom options" })).toContainText(
      `${Math.round(initial.zoom * 100)}%`,
    );
    await focusPage(page, 2);
    const last = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const frame = engine.editor.getPageViewBounds(ids[2])!;
      return engine.editor.worldToScreen({
        x: frame.x + frame.width / 2,
        y: frame.y + frame.height / 2,
      });
    });
    expect(last.x).toBeCloseTo(initial.viewport.width / 2, 5);
    expect(last.y).toBeCloseTo(initial.viewport.height / 2, 5);
    const before = await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      const changes: { zoom: number; applied: number }[] = [];
      const unsubscribe = engine.onZoomChanged((zoom) => {
        changes.push({ zoom, applied: engine.editor.getZoom() });
      });
      engine.editor.setZoom(4);
      engine.editor.panTo(-400, -700);
      unsubscribe();
      return {
        zoom: engine.editor.getZoom(),
        pan: engine.editor.getPan(),
        saved: engine.scene.saveToString(),
        changes,
      };
    });
    expect(before.changes).toEqual([{ zoom: 4, applied: 4 }]);
    await component.update(<PageNavigationFixture layout={layout} width={760} />);
    await expect(component.locator(".konvajs-content")).toHaveCSS("width", "674px");
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    expect(
      await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        return {
          zoom: engine.editor.getZoom(),
          pan: engine.editor.getPan(),
          saved: engine.scene.saveToString(),
        };
      }),
    ).toEqual({ zoom: before.zoom, pan: before.pan, saved: before.saved });
    await expect(component.getByRole("button", { name: "Zoom options" })).toContainText("400%");
  });
}
