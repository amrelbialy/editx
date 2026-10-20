import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

test("keeps an offset page's inline editor aligned while scrolling and ends editing on a canvas page click", async ({
  mount,
  page,
}) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  await focusPage(page, 1);
  const text = await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    const camera = { pan: engine.editor.getPan(), zoom: engine.editor.getZoom() };
    const id = engine.block.addText(ids[1], 90, 140, 180, 50, "Inline page", {
      style: { fontFamily: "Arial", fontSize: 28, fill: "#000000" },
    });
    engine.clearHistory();
    return {
      id,
      before: camera,
      after: { pan: engine.editor.getPan(), zoom: engine.editor.getZoom() },
    };
  });
  expect(text.after).toEqual(text.before);
  await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
  const rect = await page.evaluate(
    (id) => window.__pageNavigationHarness!.engine.editor.getBlockScreenRect(id)!,
    text.id,
  );
  const canvas = (await component.locator(".konvajs-content").boundingBox())!;
  await page.mouse.dblclick(canvas.x + rect.x + 20, canvas.y + rect.y + 15);
  const overlay = component.getByTestId("text-editor-overlay");
  await expect(overlay).toBeVisible();
  await expect(
    component.getByRole("button", { name: "Select page 3: Card", exact: true }),
  ).toBeDisabled();
  await page.keyboard.type("!");
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          window
            .__pageNavigationHarness!.engine.block.getTextRuns(id)
            .map((run) => run.text)
            .join(""),
        text.id,
      ),
    )
    .toContain("!");
  const point = await page.evaluate((id) => {
    const { engine, ids } = window.__pageNavigationHarness!;
    engine.editor.setZoom(0.2);
    engine.editor.panTo(30, 30);
    const frame = engine.editor.getPageViewBounds(ids[2])!;
    return {
      card: engine.editor.worldToScreen({ x: frame.x + 120, y: frame.y + 120 }),
      rect: engine.editor.getBlockScreenRect(id)!,
    };
  }, text.id);
  await expect
    .poll(async () => {
      const bounds = await overlay.boundingBox();
      return bounds ? Math.abs(bounds.x - canvas.x - point.rect.x) : Infinity;
    })
    .toBeLessThan(2);
  await expect
    .poll(async () => {
      const bounds = await overlay.boundingBox();
      return bounds ? Math.abs(bounds.y - canvas.y - point.rect.y) : Infinity;
    })
    .toBeLessThan(2);
  await page.mouse.click(canvas.x + point.card.x, canvas.y + point.card.y);
  await expect(overlay).toHaveCount(0);
  await expect(
    component.getByRole("button", { name: "Select page 3: Card", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const state = await page.evaluate((id) => {
    const { engine } = window.__pageNavigationHarness!;
    return {
      selected: engine.block.findAllSelected(),
      content: engine.block
        .getTextRuns(id)
        .map((run) => run.text)
        .join(""),
    };
  }, text.id);
  expect(state.selected).not.toContain(text.id);
  expect(state.content).toContain("!");
});

test("SDK navigation cancels a later page's crop preview without committing it", async ({
  mount,
  page,
}) => {
  const component = await mount(<PageNavigationFixture layout="horizontal" />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  await focusPage(page, 1);
  const before = await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    const source = document.createElement("canvas");
    source.width = 40;
    source.height = 20;
    const block = engine.block.addShape(ids[1], "rect", "image", 100, 120, 100, 100);
    engine.block.setFillImage(block, { src: source.toDataURL(), mode: "crop" });
    engine.clearHistory();
    const saved = engine.scene.saveToString();
    engine.editor.setEditMode("Crop", { blockId: block });
    engine.editor.updateImageFillCrop({ offsetX: 0.2, scale: 1.15 });
    return saved;
  });
  await expect(
    component.getByRole("button", { name: "Select page 3: Card", exact: true }),
  ).toBeDisabled();
  const after = await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    engine.scene.setActivePage(ids[2]);
    return {
      saved: engine.scene.saveToString(),
      active: engine.scene.getCurrentPage(),
      mode: engine.editor.getEditMode(),
      undo: engine.canUndo(),
    };
  });
  expect(after.mode).toBe("Transform");
  expect(after.undo).toBe(false);
  expect(JSON.parse(after.saved)).toEqual({ ...JSON.parse(before), activePageId: after.active });
  await expect(
    component.getByRole("button", { name: "Select page 3: Card", exact: true }),
  ).toBeEnabled();
});
