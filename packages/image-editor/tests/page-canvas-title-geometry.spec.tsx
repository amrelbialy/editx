import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: titles re-project after page resize, reorder and undo/redo`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const assertAligned = async () => {
      await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
      const titles = await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        const canvas = document.querySelector(".konvajs-content")!.getBoundingClientRect();
        return engine.scene.getPages().map((id, index) => {
          const frame = engine.editor.getPageViewBounds(id)!;
          const origin = engine.editor.worldToScreen(frame)!;
          const title = document.querySelector<HTMLButtonElement>(`button[data-page-id="${id}"]`)!;
          const rect = title.getBoundingClientRect();
          return {
            title: title.textContent,
            name: engine.scene.getPageProperties(id).name,
            number: index + 1,
            actual: { x: rect.x - canvas.x, y: rect.y - canvas.y },
            expected: { x: origin.x, y: origin.y - 24 },
          };
        });
      });
      expect(titles).toHaveLength(3);
      for (const title of titles) {
        expect(title.title).toBe(`Page ${title.number}: ${title.name}`);
        expect(title.actual.x).toBeCloseTo(title.expected.x, 1);
        expect(title.actual.y).toBeCloseTo(title.expected.y, 1);
      }
    };
    await assertAligned();
    await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      engine.scene.setPageProperties(ids[0], { width: 640, height: 420 });
    });
    await assertAligned();
    await page.evaluate(() => window.__pageNavigationHarness!.engine.undo());
    await assertAligned();
    await page.evaluate(() => window.__pageNavigationHarness!.engine.redo());
    await assertAligned();
    await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      engine.scene.movePage(ids[2], 0);
    });
    await assertAligned();
    await page.evaluate(() => window.__pageNavigationHarness!.engine.undo());
    await assertAligned();
    await page.evaluate(() => window.__pageNavigationHarness!.engine.redo());
    await assertAligned();
  });
}
