import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

const layouts = [
  {
    layout: "vertical",
    frames: [
      { x: 0, y: 0, width: 480, height: 320 },
      { x: 80, y: 368, width: 320, height: 480 },
      { x: 120, y: 896, width: 240, height: 240 },
    ],
  },
  {
    layout: "horizontal",
    frames: [
      { x: 0, y: 80, width: 480, height: 320 },
      { x: 528, y: 0, width: 320, height: 480 },
      { x: 896, y: 120, width: 240, height: 240 },
    ],
  },
] as const;

for (const { layout, frames } of layouts) {
  test(`${layout}: presents all mixed-size pages and activates a canvas page without a jump`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const actual = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.2);
      engine.editor.panTo(30, 30);
      return ids.map((id) => engine.editor.getPageViewBounds(id));
    });
    expect(actual).toEqual(frames);
    for (const [index, color] of [
      [0, [225, 29, 72, 255]],
      [1, [22, 163, 74, 255]],
      [2, [37, 99, 235, 255]],
    ] as const) {
      expect(
        await page.evaluate(
          (i) =>
            window.__pageNavigationHarness!.samplePixel(window.__pageNavigationHarness!.ids[i]),
          index,
        ),
      ).toEqual(color);
    }
    const before = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const frame = engine.editor.getPageViewBounds(ids[2])!;
      return {
        zoom: engine.editor.getZoom(),
        pan: engine.editor.getPan(),
        point: engine.editor.worldToScreen({ x: frame.x + 120, y: frame.y + 120 }),
      };
    });
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    await page.mouse.click(canvas.x + before.point.x, canvas.y + before.point.y);
    await expect(
      component.getByRole("button", { name: "Select page 3: Card", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        return {
          zoom: engine.editor.getZoom(),
          pan: engine.editor.getPan(),
          undo: engine.canUndo(),
        };
      }),
    ).toEqual({ zoom: before.zoom, pan: before.pan, undo: false });
  });

  test(`${layout}: wheel-scrolls full-size pages along the canvas axis`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const before = await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      engine.editor.fitToScreen();
      engine.editor.setZoom(1);
      return engine.editor.getPan();
    });
    const canvas = component.locator(".konvajs-content");
    await canvas.hover();
    await page.mouse.wheel(0, 250);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const { engine } = window.__pageNavigationHarness!;
          return engine.editor.getPan();
        }),
      )
      .not.toEqual(before);
    const after = await page.evaluate(() => window.__pageNavigationHarness!.engine.editor.getPan());
    if (layout === "vertical") {
      expect(after.y).toBeLessThan(before.y);
      expect(after.x).toBe(before.x);
    } else {
      expect(after.x).toBeLessThan(before.x);
      expect(after.y).toBe(before.y);
    }
    const visible = await page.evaluate(async () => {
      const { engine, ids, samplePixel } = window.__pageNavigationHarness!;
      const frame = engine.editor.getPageViewBounds(ids[1])!;
      const canvas = document.querySelector(".konvajs-content")!.getBoundingClientRect();
      return {
        pixel: await samplePixel(ids[1]),
        point: engine.editor.worldToScreen({ x: frame.x + 60, y: frame.y + 60 }),
        viewport: { width: canvas.width, height: canvas.height },
        zoom: engine.editor.getZoom(),
        pan: engine.editor.getPan(),
      };
    });
    expect(visible.pixel, JSON.stringify(visible)).toEqual([22, 163, 74, 255]);
    await expect(
      component.getByRole("button", { name: "Select page 1: Cover", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test(`${layout}: commits dragging on an offset page in page-local coordinates`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await focusPage(page, 1);
    expect(await page.evaluate(() => window.__pageNavigationHarness!.samplePixel())).toEqual([
      22, 163, 74, 255,
    ]);
    const before = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const marker = engine.block.getChildren(ids[1])[0];
      return {
        marker,
        position: engine.block.getPosition(marker),
        rect: engine.editor.getBlockScreenRect(marker)!,
        point: engine.editor.worldToScreen({
          x: engine.editor.getPageViewBounds(ids[1])!.x + 40,
          y: engine.editor.getPageViewBounds(ids[1])!.y + 40,
        }),
        zoom: engine.editor.getZoom(),
      };
    });
    expect(before.rect.x).toBeCloseTo(before.point.x, 1);
    expect(before.rect.y).toBeCloseTo(before.point.y, 1);
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    const x = canvas.x + before.rect.x + before.rect.width / 2;
    const y = canvas.y + before.rect.y + before.rect.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y + 20, { steps: 8 });
    await page.mouse.up();
    const after = await page.evaluate((marker) => {
      const { engine, ids } = window.__pageNavigationHarness!;
      return {
        position: engine.block.getPosition(marker),
        page: engine.block.getPosition(ids[1]),
        undo: engine.canUndo(),
      };
    }, before.marker);
    expect(Math.abs(after.position.x - before.position.x - 30 / before.zoom)).toBeLessThanOrEqual(
      1 / before.zoom,
    );
    expect(Math.abs(after.position.y - before.position.y - 20 / before.zoom)).toBeLessThanOrEqual(
      1 / before.zoom,
    );
    expect(after.page).toEqual({ x: 0, y: 0 });
    expect(after.undo).toBe(true);
    expect(
      await page.evaluate((marker) => {
        const { engine } = window.__pageNavigationHarness!;
        engine.undo();
        return engine.block.getPosition(marker);
      }, before.marker),
    ).toEqual(before.position);
  });
}
