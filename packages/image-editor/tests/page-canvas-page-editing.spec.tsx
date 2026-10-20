import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: selecting the same page background ends inline editing without a camera or history change`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await focusPage(page, 1);
    const text = await page.evaluate(() => {
      const { engine, ids } = window.__pageNavigationHarness!;
      return engine.block.addText(ids[1], 90, 140, 180, 50, "Keep this text", {
        style: { fontFamily: "Arial", fontSize: 28 },
      });
    });
    await page.evaluate(() => window.__pageNavigationHarness!.samplePixel());
    const rect = await page.evaluate(
      (id) => window.__pageNavigationHarness!.engine.editor.getBlockScreenRect(id)!,
      text,
    );
    const canvas = (await component.locator(".konvajs-content").boundingBox())!;
    await page.mouse.dblclick(canvas.x + rect.x + 20, canvas.y + rect.y + 15);
    const overlay = component.getByTestId("text-editor-overlay");
    await expect(overlay).toBeVisible();
    await page.keyboard.type("!");
    await expect
      .poll(() =>
        page.evaluate(
          (id) => window.__pageNavigationHarness!.engine.block.getTextContent(id),
          text,
        ),
      )
      .toContain("!");
    const before = await page.evaluate((id) => {
      const { engine, ids } = window.__pageNavigationHarness!;
      engine.clearHistory();
      const frame = engine.editor.getPageViewBounds(ids[1])!;
      return {
        saved: engine.scene.saveToString(),
        content: engine.block.getTextContent(id),
        page: ids[1],
        camera: { zoom: engine.editor.getZoom(), pan: engine.editor.getPan() },
        point: engine.editor.worldToScreen({ x: frame.x + 260, y: frame.y + 400 })!,
      };
    }, text);
    await expect(overlay).toBeVisible();
    await page.mouse.click(canvas.x + before.point.x, canvas.y + before.point.y);
    await expect(overlay).toHaveCount(0);
    expect(
      await page.evaluate((id) => {
        const { engine } = window.__pageNavigationHarness!;
        return {
          saved: engine.scene.saveToString(),
          content: engine.block.getTextContent(id),
          page: engine.scene.getCurrentPage(),
          selection: engine.block.findAllSelected(),
          session: engine.block.getTextEditingSession(id),
          camera: { zoom: engine.editor.getZoom(), pan: engine.editor.getPan() },
          undo: engine.canUndo(),
        };
      }, text),
    ).toEqual({
      saved: before.saved,
      content: before.content,
      page: before.page,
      selection: [before.page],
      session: null,
      camera: before.camera,
      undo: false,
    });
  });
}
