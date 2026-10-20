import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: pointer resize and rotation remain page-local across layout changes`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await focusPage(page, 1);
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const before = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const marker = engine.block.getChildren(ids[1])[0];
      return {
        marker,
        poster: ids[1],
        rect: engine.editor.getBlockScreenRect(marker)!,
        size: engine.block.getSize(marker),
        position: engine.block.getPosition(marker),
        zoom: engine.editor.getZoom(),
        saved: engine.scene.saveToString(),
      };
    });
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    await page.mouse.click(
      canvas.x + before.rect.x + before.rect.width / 2,
      canvas.y + before.rect.y + before.rect.height / 2,
    );
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const x = canvas.x + before.rect.x + before.rect.width;
    const y = canvas.y + before.rect.y + before.rect.height;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 20, y + 20, { steps: 8 });
    await page.mouse.up();
    const resized = await page.evaluate((id) => {
      const { engine } = window.__pageNavigationHarness!;
      return {
        size: engine.block.getSize(id),
        position: engine.block.getPosition(id),
        saved: engine.scene.saveToString(),
      };
    }, before.marker);
    expect(resized.position.x).toBeCloseTo(before.position.x, 4);
    expect(resized.position.y).toBeCloseTo(before.position.y, 4);
    expect(resized.size.width).toBeCloseTo(before.size.width + 20 / before.zoom, 0);
    expect(resized.size.height).toBeCloseTo(before.size.height + 20 / before.zoom, 0);
    expect(
      await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        engine.undo();
        const saved = engine.scene.saveToString();
        engine.redo();
        return { saved, redone: engine.scene.saveToString() };
      }),
    ).toEqual({ saved: before.saved, redone: resized.saved });
    const next = layout === "vertical" ? "horizontal" : "vertical";
    await component.update(<PageNavigationFixture layout={next} />);
    await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const frame = engine.editor.getPageViewBounds(ids[1])!;
      engine.editor.setZoom(3);
      engine.editor.panTo(100 - frame.x * 3, 100 - frame.y * 3);
    });
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const target = await page.evaluate(
      (id) => window.__pageNavigationHarness!.engine.editor.getBlockScreenRect(id)!,
      before.marker,
    );
    await page.mouse.click(
      canvas.x + target.x + target.width / 2,
      canvas.y + target.y + target.height / 2,
    );
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const rotation = await page.evaluate((id) => {
      const { engine } = window.__pageNavigationHarness!;
      const rect = engine.editor.getBlockScreenRect(id)!;
      return {
        rect,
        saved: engine.scene.saveToString(),
        selected: engine.block.findAllSelected(),
        start: { x: rect.x + rect.width / 2, y: rect.y - 30 },
        end: { x: rect.x + rect.width + 30, y: rect.y + rect.height / 2 },
      };
    }, before.marker);
    expect(rotation.saved).toBe(resized.saved);
    expect(rotation.selected).toContain(before.marker);
    await page.mouse.move(canvas.x + rotation.start.x, canvas.y + rotation.start.y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + rotation.end.x, canvas.y + rotation.end.y, { steps: 12 });
    await page.mouse.up();
    const rotated = await page.evaluate((id) => {
      const { engine, ids } = window.__pageNavigationHarness!;
      return {
        rotation: engine.block.getRotation(id),
        size: engine.block.getSize(id),
        parent: engine.block.getParent(id),
        page: engine.block.getPosition(ids[1]),
        saved: engine.scene.saveToString(),
      };
    }, before.marker);
    expect(rotated.rotation, JSON.stringify({ rotation, rotated, canvas })).toBeCloseTo(90, 0);
    expect(rotated.size.width).toBeCloseTo(resized.size.width, 4);
    expect(rotated.size.height).toBeCloseTo(resized.size.height, 4);
    expect(rotated.parent).toBe(before.poster);
    expect(rotated.page).toEqual({ x: 0, y: 0 });
    expect(
      await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        engine.undo();
        const saved = engine.scene.saveToString();
        engine.redo();
        return { saved, redone: engine.scene.saveToString() };
      }),
    ).toEqual({ saved: resized.saved, redone: rotated.saved });
  });
}
