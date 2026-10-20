import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  for (const editing of ["text", "crop"] as const) {
    test(`${layout}: changing config layout safely ends ${editing} editing`, async ({
      mount,
      page,
    }) => {
      const component = await mount(<PageNavigationFixture layout={layout} />);
      await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
      await focusPage(page, 1);
      const block = await page.evaluate((kind) => {
        const { engine, ids } = window.__pageNavigationHarness!;
        if (kind === "text") {
          return engine.block.addText(ids[1], 90, 140, 180, 50, "Keep typed text", {
            style: { fontFamily: "Arial", fontSize: 28, fill: "#000000" },
          });
        }
        const source = document.createElement("canvas");
        source.width = 40;
        source.height = 20;
        const image = engine.block.addShape(ids[1], "rect", "image", 100, 120, 100, 100);
        engine.block.setFillImage(image, { src: source.toDataURL(), mode: "crop" });
        engine.clearHistory();
        engine.editor.setEditMode("Crop", { blockId: image });
        engine.editor.updateImageFillCrop({ offsetX: 0.2, scale: 1.15 });
        return image;
      }, editing);
      if (editing === "text") {
        await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
        const rect = await page.evaluate(
          (id) => window.__pageNavigationHarness!.engine.editor.getBlockScreenRect(id)!,
          block,
        );
        const canvas = (await component.locator(".konvajs-content").boundingBox())!;
        await page.mouse.dblclick(canvas.x + rect.x + 20, canvas.y + rect.y + 15);
        await expect(component.getByTestId("text-editor-overlay")).toBeVisible();
        await page.keyboard.type("!");
        await expect
          .poll(() =>
            page.evaluate(
              (id) => window.__pageNavigationHarness!.engine.block.getTextContent(id),
              block,
            ),
          )
          .toContain("!");
      }
      const before = await page.evaluate(() => {
        const { engine } = window.__pageNavigationHarness!;
        return {
          page: engine.scene.getCurrentPage(),
          saved: engine.scene.saveToString(),
          undo: engine.canUndo(),
          redo: engine.canRedo(),
        };
      });
      const next = layout === "vertical" ? "horizontal" : "vertical";
      await component.update(<PageNavigationFixture layout={next} />);
      await expect
        .poll(() =>
          page.evaluate(() => window.__pageNavigationHarness!.engine.editor.getPageViewMode()),
        )
        .toBe(`${next}-pages`);
      await expect(component.getByTestId("text-editor-overlay")).toHaveCount(0);
      await expect(
        component.getByRole("button", { name: "Select page 3: Card", exact: true }),
      ).toBeEnabled();
      expect(
        await page.evaluate((id) => {
          const { engine } = window.__pageNavigationHarness!;
          return {
            state: {
              page: engine.scene.getCurrentPage(),
              saved: engine.scene.saveToString(),
              undo: engine.canUndo(),
              redo: engine.canRedo(),
            },
            mode: engine.editor.getEditMode(),
            session: engine.block.getTextEditingSession(id),
            crop: engine.editor.getImageFillCrop(),
          };
        }, block),
      ).toEqual({ state: before, mode: "Transform", session: null, crop: null });
    });
  }
}
