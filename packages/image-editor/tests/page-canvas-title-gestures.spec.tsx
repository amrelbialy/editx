import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: crossing a page title does not intercept an existing canvas marquee`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const fixture = await page.evaluate(async (direction) => {
      const { engine, ids, samplePixel } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.35);
      engine.editor.panTo(40, 40);
      await samplePixel();
      const frame = engine.editor.getPageViewBounds(ids[0])!;
      return {
        marker: engine.block.getChildren(ids[0])[0],
        point: engine.editor.worldToScreen({
          x: frame.x + 5,
          y: frame.y + (direction === "vertical" ? 5 : frame.height - 5),
        })!,
      };
    }, layout);
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    const title = component.getByRole("button", { name: "Select page 2: Poster", exact: true });
    const bounds = (await title.boundingBox())!;
    await page.mouse.move(canvas.x + fixture.point.x, canvas.y + fixture.point.y);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2, { steps: 8 });
    await expect(title).toHaveCSS("pointer-events", "none");
    await page.mouse.up();
    await expect(title).toHaveCSS("pointer-events", "auto");
    await expect
      .poll(() =>
        page.evaluate(() => window.__pageNavigationHarness!.engine.block.findAllSelected()),
      )
      .toEqual([fixture.marker]);
  });
}
