import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { outlineAlpha } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: page hover and selection are outline-only and artwork remains independently selectable`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.35);
      engine.editor.panTo(40, 40);
    });
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    const emptyPoint = () =>
      page.evaluate(() => {
        const { engine, ids } = window.__pageNavigationHarness!;
        const frame = engine.editor.getPageViewBounds(ids[1])!;
        return engine.editor.worldToScreen({ x: frame.x + 250, y: frame.y + 350 })!;
      });
    let point = await emptyPoint();
    await page.mouse.move(canvas.x + point.x, canvas.y + point.y);
    expect(await outlineAlpha(page, 1)).toBeGreaterThan(0);
    await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.45);
      engine.editor.panTo(40, 40);
    });
    expect(await outlineAlpha(page, 1)).toBeGreaterThan(0);
    point = await emptyPoint();
    await page.mouse.click(canvas.x + point.x, canvas.y + point.y);
    await expect(
      component.getByRole("button", { name: "Select page 2: Poster", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const selected = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      return {
        selected: engine.block.findAllSelected(),
        page: ids[1],
        rect: engine.editor.getBlockScreenRect(ids[1])!,
        outline: engine.editor.getSelectedBlockScreenRect()!,
        saved: engine.scene.saveToString(),
        camera: { zoom: engine.editor.getZoom(), pan: engine.editor.getPan() },
      };
    });
    expect(selected.selected).toEqual([selected.page]);
    expect(Math.abs(selected.outline.width - selected.rect.width)).toBeLessThanOrEqual(3);
    expect(Math.abs(selected.outline.height - selected.rect.height)).toBeLessThanOrEqual(3);
    await page.mouse.move(canvas.x + 2, canvas.y + 2);
    expect(await outlineAlpha(page, 1)).toBeGreaterThan(0);
    await page.keyboard.press("Delete");
    await page.keyboard.press("Control+d");
    await page.keyboard.press("Control+g");
    await page.mouse.move(canvas.x + point.x, canvas.y + point.y);
    await page.mouse.down();
    await page.mouse.move(canvas.x + point.x + 15, canvas.y + point.y + 15, { steps: 4 });
    await page.mouse.up();
    const after = await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      return {
        saved: engine.scene.saveToString(),
        undo: engine.canUndo(),
        camera: { zoom: engine.editor.getZoom(), pan: engine.editor.getPan() },
      };
    });
    expect(after).toEqual({ saved: selected.saved, undo: false, camera: selected.camera });
    await expect(component.getByText("Deleted", { exact: true })).toHaveCount(0);
    await expect(component.getByText("Duplicated", { exact: true })).toHaveCount(0);

    const marker = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      engine.block.select(ids[1]);
      const id = engine.block.getChildren(ids[1])[0];
      return { id, rect: engine.editor.getBlockScreenRect(id)! };
    });
    await page.keyboard.down("Shift");
    await page.mouse.click(
      canvas.x + marker.rect.x + marker.rect.width / 2,
      canvas.y + marker.rect.y + marker.rect.height / 2,
    );
    await page.keyboard.up("Shift");
    expect(
      await page.evaluate(() => window.__pageNavigationHarness!.engine.block.findAllSelected()),
    ).toEqual([marker.id]);
    const restored = await page.evaluate(
      () => window.__pageNavigationHarness!.engine.editor.getSelectedBlockScreenRect()!,
    );
    expect(restored.width).toBeGreaterThan(marker.rect.width + 5);
    await expect(component.getByRole("group", { name: "Block actions" })).toBeVisible();
  });
}
