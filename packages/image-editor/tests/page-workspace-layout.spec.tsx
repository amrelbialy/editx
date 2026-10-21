import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: a narrow caption can open properties on its first double-click`, async ({ mount, page }) => {
    const component = await mount(<PageNavigationFixture layout={layout} width={360} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await page.evaluate(async () => {
      const { engine, samplePixel } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.25);
      engine.editor.panTo(20, 40);
      await samplePixel();
    });
    const title = component.getByRole("button", { name: "Select page 1: Cover", exact: true });
    const before = (await title.boundingBox())!;
    await title.dblclick();
    await expect(page.getByRole("dialog", { name: "Rename and resize page" })).toBeVisible();
    const after = (await component.locator("button[data-page-id]").first().boundingBox())!;
    expect(after.x).toBe(before.x);
    expect(after.y).toBe(before.y);
    expect(await page.evaluate(() => window.__pageNavigationHarness!.engine.canUndo())).toBe(false);
  });

  test(`${layout}: compact safe lanes give the canvas most of the editor height`, async ({ mount, page }) => {
    const component = await mount(<PageNavigationFixture layout={layout} width={900} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    const editor = (await component.boundingBox())!;
    expect(canvas.height / editor.height).toBeGreaterThan(0.7);
    const before = await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      return { zoom: engine.editor.getZoom(), pan: engine.editor.getPan() };
    });
    await component.getByRole("button", { name: "Select page 1: Cover", exact: true }).click();
    const properties = (await component.getByRole("toolbar", { name: "Page properties" }).boundingBox())!;
    const actions = (await component.getByRole("toolbar", { name: "Page actions" }).boundingBox())!;
    const title = (await component.getByRole("button", { name: "Select page 1: Cover", exact: true }).boundingBox())!;
    expect(properties.y + properties.height).toBeLessThanOrEqual(actions.y);
    expect(title.x + title.width).toBeLessThanOrEqual(actions.x);
    const pageTop = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      return engine.editor.worldToScreen(engine.editor.getPageViewBounds(ids[0])!)!.y;
    });
    expect(actions.y + actions.height).toBeLessThanOrEqual(canvas.y + pageTop + 1);
    expect(await component.locator(".konvajs-content").boundingBox()).toEqual(canvas);
    expect(await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      return { zoom: engine.editor.getZoom(), pan: engine.editor.getPan() };
    })).toEqual(before);
  });

  test(`${layout}: page captions stay screen-sized from 5% to 2000% zoom`, async ({ mount, page }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    for (const zoom of [0.05, 0.25, 0.35, 1, 20]) {
      await page.evaluate(async (next) => {
        const { engine, samplePixel } = window.__pageNavigationHarness!;
        engine.editor.setZoom(next);
        await samplePixel();
      }, zoom);
      const captions = await component.locator("button[data-page-id]").evaluateAll((buttons) =>
        buttons.map((button) => {
          const css = getComputedStyle(button);
          return { font: css.fontSize, height: button.getBoundingClientRect().height, transform: css.transform };
        }),
      );
      expect(captions).toHaveLength(3);
      for (const caption of captions) expect(caption).toEqual({ font: "12px", height: 24, transform: "none" });
    }
    await page.evaluate(async () => {
      const { engine, samplePixel } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.25);
      await samplePixel();
    });
    if (layout === "vertical") {
      await expect(component.getByRole("button", { name: "Select page 2: Poster", exact: true }))
        .toHaveAttribute("data-page-title-placement", "inset");
    }
  });
}
