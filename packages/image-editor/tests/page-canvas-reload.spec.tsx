import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

test("same-ID native reload closes stale text and crop UI without changing loaded content", async ({
  mount,
  page,
}) => {
  const component = await mount(<PageNavigationFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  await focusPage(page, 1);
  const fixture = await page.evaluate(() => {
    const { engine, ids } = window.__pageNavigationHarness!;
    const text = engine.block.addText(ids[1], 90, 140, 180, 50, "Loaded text", {
      style: { fontFamily: "Arial", fontSize: 28, fill: "#000000" },
    });
    const source = document.createElement("canvas");
    source.width = 40;
    source.height = 20;
    const image = engine.block.addShape(ids[1], "rect", "image", 200, 300, 80, 80);
    engine.block.setFillImage(image, { src: source.toDataURL(), mode: "crop" });
    engine.scene.setPageProperties(ids[1], { name: "Saved Poster" });
    engine.clearHistory();
    return { text, image, saved: engine.scene.saveToString() };
  });
  await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
  const rect = await page.evaluate(
    (id) => window.__pageNavigationHarness!.engine.editor.getBlockScreenRect(id)!,
    fixture.text,
  );
  const canvas = (await component.locator(".konvajs-content").boundingBox())!;
  await page.mouse.dblclick(canvas.x + rect.x + 20, canvas.y + rect.y + 15);
  await expect(component.getByTestId("text-editor-overlay")).toBeVisible();
  await page.keyboard.type("!");
  await expect
    .poll(() =>
      page.evaluate(
        (id) => window.__pageNavigationHarness!.engine.block.getTextContent(id),
        fixture.text,
      ),
    )
    .toContain("!");
  const loaded = await page.evaluate(async ({ saved, text }) => {
    const { engine } = window.__pageNavigationHarness!;
    await engine.scene.loadFromString(saved);
    return {
      saved: engine.scene.saveToString(),
      content: engine.block.getTextContent(text),
      session: engine.block.getTextEditingSession(text),
      undo: engine.canUndo(),
    };
  }, fixture);
  expect(loaded).toEqual({
    saved: fixture.saved,
    content: "Loaded text",
    session: null,
    undo: false,
  });
  await expect(component.getByTestId("text-editor-overlay")).toHaveCount(0);
  const cropped = await page.evaluate(async ({ saved, image }) => {
    const { engine } = window.__pageNavigationHarness!;
    engine.editor.setEditMode("Crop", { blockId: image });
    engine.editor.updateImageFillCrop({ offsetX: 0.2, scale: 1.15 });
    await engine.scene.loadFromString(saved);
    return {
      saved: engine.scene.saveToString(),
      crop: engine.editor.getImageFillCrop(),
      mode: engine.editor.getEditMode(),
      undo: engine.canUndo(),
    };
  }, fixture);
  expect(cropped).toEqual({ saved: fixture.saved, crop: null, mode: "Transform", undo: false });
  await expect(
    component.getByRole("button", { name: "Select page 2: Saved Poster", exact: true }),
  ).toBeEnabled();
});
