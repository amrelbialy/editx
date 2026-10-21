import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: page bars track selection while Add Page stays docked below the canvas`, async ({
    mount, page,
  }) => {
    const component = await mount(
      <PageNavigationFixture layout={layout} width={layout === "vertical" ? 360 : 900} />,
    );
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    const canvas = component.locator(".konvajs-content");
    const beforeBounds = (await canvas.boundingBox())!;
    const addPage = component.getByRole("button", { name: "Add page", exact: true });
    await expect(addPage).toBeVisible();
    const beforeAddBounds = (await addPage.boundingBox())!;
    const beforeCamera = await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      return { pan: engine.editor.getPan(), zoom: engine.editor.getZoom() };
    });
    const title = component.getByRole("button", { name: "Select page 1: Cover", exact: true });
    await title.click();
    await expect(component.getByRole("toolbar", { name: "Page properties" })).toBeVisible();
    await expect(component.getByRole("toolbar", { name: "Page actions" })).toBeVisible();
    expect(await canvas.boundingBox()).toEqual(beforeBounds);
    expect(await page.evaluate(() => {
      const { engine } = window.__pageNavigationHarness!;
      return { pan: engine.editor.getPan(), zoom: engine.editor.getZoom() };
    })).toEqual(beforeCamera);

    const assertPlacement = async () => {
      const properties = (await component.getByRole("toolbar", { name: "Page properties" }).boundingBox())!;
      const actions = (await component.getByRole("toolbar", { name: "Page actions" }).boundingBox())!;
      const add = (await component.getByRole("button", { name: "Add page", exact: true }).boundingBox())!;
      const frame = await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        const bounds = engine.editor.getPageViewBounds(engine.scene.getCurrentPage()!)!;
        return { ...engine.editor.worldToScreen(bounds)!, width: bounds.width * engine.editor.getZoom(),
          height: bounds.height * engine.editor.getZoom() };
      });
      const canvasBounds = (await canvas.boundingBox())!;
      const navigationBounds = (await component.getByRole("navigation").boundingBox())!;
      const editorBounds = (await component.boundingBox())!;
      expect(properties.y + properties.height).toBeLessThanOrEqual(canvasBounds.y);
      expect(properties.y + properties.height).toBeLessThanOrEqual(actions.y);
      expect(actions.x + actions.width).toBeCloseTo(
        navigationBounds.x + Math.max(104, Math.min(frame.x + Math.max(frame.width, 208), navigationBounds.width - 8)), 1,
      );
      expect(actions.y + actions.height).toBeCloseTo(
        canvasBounds.y + Math.max(24, frame.y), 1,
      );
      expect(add.x + add.width / 2).toBeCloseTo(navigationBounds.x + navigationBounds.width / 2, 1);
      expect(add.y).toBeGreaterThanOrEqual(canvasBounds.y + canvasBounds.height);
      expect(add.y + add.height).toBeLessThanOrEqual(editorBounds.y + editorBounds.height);
      expect(add).toEqual(beforeAddBounds);
    };
    await assertPlacement();
    await page.evaluate(async () => {
      const { engine, samplePixel } = window.__pageNavigationHarness!;
      engine.editor.setZoom(0.4);
      engine.editor.panTo(40, 60);
      await samplePixel();
    });
    await assertPlacement();
    const more = component.getByRole("button", { name: "Page actions: Page 1: Cover", exact: true });
    await more.focus();
    await more.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(more).toBeFocused();
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await title.dblclick();
    await expect(page.getByRole("dialog", { name: "Rename and resize page" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancel", exact: true }).click();
    const point = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const marker = engine.block.getChildren(ids[0])[0];
      const rect = engine.editor.getBlockScreenRect(marker)!;
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
    const currentCanvas = (await canvas.boundingBox())!;
    await page.mouse.click(currentCanvas.x + point.x, currentCanvas.y + point.y);
    await expect(component.getByRole("toolbar", { name: "Page properties" })).toHaveCount(0);
    await expect(component.getByRole("toolbar", { name: "Page actions" })).toHaveCount(0);
    await expect(addPage).toBeVisible();
    expect(await addPage.boundingBox()).toEqual(beforeAddBounds);
  });
}

test("Add Page is available without a selection and after selecting artwork", async ({ mount, page }) => {
  const component = await mount(<PageNavigationFixture width={360} />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  const add = component.getByRole("button", { name: "Add page", exact: true });
  await expect(add).toBeVisible();
  await expect(component.getByRole("toolbar", { name: "Page properties" })).toHaveCount(0);
  await add.click();
  expect(await page.evaluate(() => window.__pageNavigationHarness!.engine.scene.getPages().length)).toBe(4);
  await component.getByRole("button", { name: "Undo", exact: true }).click();
  await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    engine.block.select(engine.block.getChildren(ids[0])[0]);
  });
  await expect(add).toBeEnabled();
  await expect(component.getByRole("toolbar", { name: "Page properties" })).toHaveCount(0);
  await add.click();
  expect(await page.evaluate(() => window.__pageNavigationHarness!.engine.scene.getPages().length)).toBe(4);
});

test("page background color drafts apply once, preserve transparency, and follow undo/redo", async ({
  mount, page,
}) => {
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  const initial = await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    const properties = engine.scene.getPageProperties(ids[0]);
    engine.scene.setPageProperties(ids[0], { backgroundColor: { ...properties.backgroundColor, a: 0.4 } });
    engine.clearHistory();
    return engine.scene.getPageProperties(ids[0]).backgroundColor;
  });
  await component.getByRole("button", { name: "Select page 1: Cover", exact: true }).click();
  await component.getByRole("button", { name: "Background color", exact: true }).click();
  await page.getByLabel("Page background color", { exact: true }).evaluate((input: HTMLInputElement) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "#ff0000");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    return { color: engine.scene.getPageProperties(ids[0]).backgroundColor, undo: engine.canUndo() };
  })).toEqual({ color: initial, undo: false });
  await page.getByRole("button", { name: "Apply color", exact: true }).click();
  expect(await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    return engine.scene.getPageProperties(ids[0]).backgroundColor;
  })).toEqual({ r: 1, g: 0, b: 0, a: 0.4 });
  await component.getByRole("button", { name: "Undo", exact: true }).click();
  expect(await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    return { color: engine.scene.getPageProperties(ids[0]).backgroundColor, undo: engine.canUndo() };
  })).toEqual({ color: initial, undo: false });
  await component.getByRole("button", { name: "Redo", exact: true }).click();
  await component.getByRole("button", { name: "Background color", exact: true }).click();
  await expect(page.getByLabel("Page background color", { exact: true })).toHaveValue("#ff0000");
});
