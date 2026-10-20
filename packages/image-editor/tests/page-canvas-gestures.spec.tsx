import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: first drag and marquee activate their page without moving the camera`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const before = await page.evaluate(async () => {
      const { engine, ids, samplePixel } = window.__pageNavigationHarness!;
      const cover = engine.block.getChildren(ids[0])[0];
      const marker = engine.block.getChildren(ids[1])[0];
      engine.block.select(cover);
      engine.editor.setZoom(0.5);
      engine.editor.panTo(0, 0);
      await samplePixel(ids[1]);
      return {
        marker,
        poster: ids[1],
        cover,
        position: engine.block.getPosition(marker),
        rect: engine.editor.getBlockScreenRect(marker)!,
        camera: { pan: engine.editor.getPan(), zoom: engine.editor.getZoom() },
        saved: engine.scene.saveToString(),
      };
    });
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    const x = canvas.x + before.rect.x + before.rect.width / 2;
    const y = canvas.y + before.rect.y + before.rect.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    expect(
      await page.evaluate(() => window.__pageNavigationHarness!.engine.scene.getCurrentPage()),
    ).toBe(before.poster);
    await page.mouse.move(x + 30, y + 20, { steps: 8 });
    await page.mouse.up();
    const after = await page.evaluate(({ marker }) => {
      const { engine } = window.__pageNavigationHarness!;
      return {
        page: engine.scene.getCurrentPage(),
        parent: engine.block.getParent(marker),
        position: engine.block.getPosition(marker),
        selection: engine.block.findAllSelected(),
        camera: { pan: engine.editor.getPan(), zoom: engine.editor.getZoom() },
      };
    }, before);
    expect(after.page).toBe(before.poster);
    expect(after.parent).toBe(before.poster);
    expect(after.position.x).toBeCloseTo(before.position.x + 60, 0);
    expect(after.position.y).toBeCloseTo(before.position.y + 40, 0);
    expect(after.selection).not.toContain(before.cover);
    expect(after.camera).toEqual(before.camera);
    expect(
      await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        engine.undo();
        return JSON.parse(engine.scene.saveToString());
      }),
    ).toEqual({ ...JSON.parse(before.saved), activePageId: before.poster });
    const points = await page.evaluate(
      async ({ axis }) => {
        const { engine, ids, samplePixel } = window.__pageNavigationHarness!;
        engine.scene.setActivePage(ids[0]);
        await samplePixel();
        const poster = engine.editor.getPageViewBounds(ids[1])!;
        const cover = engine.editor.getPageViewBounds(ids[0])!;
        return {
          start: engine.editor.worldToScreen({
            x: poster.x + 100,
            y: poster.y + (axis === "vertical" ? 100 : 10),
          }),
          end: engine.editor.worldToScreen({
            x: cover.x + 20,
            y: cover.y + (axis === "vertical" ? 20 : 100),
          }),
        };
      },
      { axis: layout },
    );
    await page.mouse.move(canvas.x + points.start.x, canvas.y + points.start.y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + points.end.x, canvas.y + points.end.y, { steps: 8 });
    await page.mouse.up();
    expect(
      await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        return {
          page: engine.scene.getCurrentPage(),
          selection: engine.block.findAllSelected(),
          camera: { pan: engine.editor.getPan(), zoom: engine.editor.getZoom() },
          undo: engine.canUndo(),
        };
      }),
    ).toEqual({
      page: before.poster,
      selection: [before.marker],
      camera: before.camera,
      undo: false,
    });
  });
}
