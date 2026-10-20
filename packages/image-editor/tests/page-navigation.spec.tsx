import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";

test("is opt-in and preserves the legacy canvas when disabled", async ({ mount, page }) => {
  const component = await mount(<PageNavigationFixture enabled={false} />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  await expect(component.getByRole("navigation", { name: "Pages" })).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__pageNavigationHarness!.engine.editor.getPageViewMode()),
  ).toBe("all-pages");
});

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: titles replace the thumbnail strip and follow the camera with pointer and keyboard selection`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const navigation = component.getByRole("navigation", { name: "Pages" });
    await expect(navigation.getByRole("button")).toHaveText(["Page 1", "Page 2", "Page 3"]);
    await expect(navigation.locator("img")).toHaveCount(0);
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    expect(canvas.height).toBeGreaterThan(500);
    const before = await page.evaluate(async () => {
      const { engine, ids, samplePixel } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.35);
      engine.editor.panTo(40, 40);
      await samplePixel();
      const frame = engine.editor.getPageViewBounds(ids[1])!;
      return {
        origin: engine.editor.worldToScreen(frame)!,
        zoom: engine.editor.getZoom(),
        pan: engine.editor.getPan(),
        saved: engine.scene.saveToString(),
      };
    });
    const title = navigation.getByRole("button", { name: "Select page 2: Poster", exact: true });
    const bounds = (await title.boundingBox())!;
    expect(bounds.x).toBeCloseTo(canvas.x + before.origin.x, 1);
    expect(bounds.y).toBeCloseTo(canvas.y + before.origin.y - 36 * before.zoom, 1);
    await title.hover();
    await expect(navigation.getByTestId("page-title-hover-outline")).toBeVisible();
    await title.click();
    await expect(title).toHaveAttribute("aria-pressed", "true");
    const selected = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      return {
        page: engine.scene.getCurrentPage(),
        selection: engine.block.findAllSelected(),
        expected: ids[1],
        zoom: engine.editor.getZoom(),
        pan: engine.editor.getPan(),
        saved: engine.scene.saveToString(),
        undo: engine.canUndo(),
      };
    });
    expect(selected.selection).toEqual([selected.expected]);
    expect(selected.page).toBe(selected.expected);
    expect(selected.zoom).toBe(before.zoom);
    expect(selected.pan).toEqual(before.pan);
    expect(JSON.parse(selected.saved)).toEqual({
      ...JSON.parse(before.saved),
      activePageId: selected.page,
    });
    expect(selected.undo).toBe(false);

    await page.keyboard.press("Tab");
    const last = navigation.getByRole("button", { name: "Select page 3: Card", exact: true });
    await expect(last).toBeFocused();
    await expect(last).toHaveAttribute("aria-pressed", "true");
    await expect(last).toBeInViewport();
    const focused = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const frame = engine.editor.getPageViewBounds(ids[2])!;
      return engine.editor.worldToScreen({
        x: frame.x + frame.width / 2,
        y: frame.y + frame.height / 2,
      })!;
    });
    expect(focused.x).toBeCloseTo(canvas.width / 2, 4);
    expect(focused.y).toBeCloseTo(canvas.height / 2, 4);
  });
}

test("renumbers and refreshes page titles across reordering, renaming and native load", async ({
  mount,
  page,
}) => {
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  const navigation = component.getByRole("navigation", { name: "Pages" });
  const loaded = await page.evaluate(async () => {
    const { engine, ids } = window.__pageNavigationHarness!;
    engine.scene.movePage(ids[2], 0);
    engine.scene.setPageProperties(ids[1], { name: "Updated" });
    const saved = engine.scene.saveToString();
    await engine.scene.loadFromString(saved);
    return { saved, loaded: engine.scene.saveToString(), pages: engine.scene.getPages().length };
  });
  await expect(
    navigation.getByRole("button", { name: "Select page 1: Card", exact: true }),
  ).toHaveText("Page 1");
  await expect(
    navigation.getByRole("button", { name: "Select page 2: Cover", exact: true }),
  ).toHaveText("Page 2");
  await expect(
    navigation.getByRole("button", { name: "Select page 3: Updated", exact: true }),
  ).toHaveText("Page 3");
  expect(loaded.loaded).toBe(loaded.saved);
  expect(loaded.pages).toBe(3);
});
