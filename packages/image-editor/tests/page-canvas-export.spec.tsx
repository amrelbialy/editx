import { expect, test } from "@playwright/experimental-ct-react";
import { PageNavigationFixture } from "./page-navigation.component";
import { focusPage } from "./page-navigation.helpers";

for (const layout of ["vertical", "horizontal"] as const) {
  test(`${layout}: exports ignore live layout and restore the offset canvas`, async ({
    mount,
    page,
  }) => {
    const component = await mount(<PageNavigationFixture layout={layout} />);
    await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
    await focusPage(page, 1);
    expect(await page.evaluate(() => window.__pageNavigationHarness!.samplePixel())).toEqual([
      22, 163, 74, 255,
    ]);
    const result = await page.evaluate(async () => {
      const { engine, ids } = window.__pageNavigationHarness!;
      const marker = engine.block.getChildren(ids[1])[0];
      const mode = engine.editor.getPageViewMode();
      const preview = await engine.exportPageThumbnail(ids[1], { maxWidth: 160, maxHeight: 96 });
      engine.editor.setPageViewMode("all-pages");
      const sceneReference = await engine.exportScene();
      const blockReference = await engine.exportBlock(marker, { width: 40, height: 40 });
      engine.editor.setPageViewMode(mode);
      engine.editor.fitToScreen();
      const state = () => ({
        mode: engine.editor.getPageViewMode(),
        pan: engine.editor.getPan(),
        zoom: engine.editor.getZoom(),
        bounds: ids.map((id) => engine.editor.getPageViewBounds(id)),
        selection: engine.block.findAllSelected(),
        saved: engine.scene.saveToString(),
        undo: engine.canUndo(),
        redo: engine.canRedo(),
      });
      const before = state();
      const scene = await engine.exportScene();
      const block = await engine.exportBlock(marker, { width: 40, height: 40 });
      const exported = await engine.exportPage(ids[1]);
      const cached = await engine.exportPageThumbnail(ids[1], { maxWidth: 160, maxHeight: 96 });
      const bytes = async (blob: Blob) => [...new Uint8Array(await blob.arrayBuffer())];
      const bitmap = await createImageBitmap(exported);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext("2d")!;
      context.drawImage(bitmap, 0, 0);
      const pixel = [...context.getImageData(60, 60, 1, 1).data];
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return {
        before,
        after: state(),
        scene: await bytes(scene),
        sceneReference: await bytes(sceneReference),
        block: await bytes(block),
        blockReference: await bytes(blockReference),
        cacheHit: cached === preview,
        dimensions,
        pixel,
      };
    });
    expect(result.scene).toEqual(result.sceneReference);
    expect(result.block).toEqual(result.blockReference);
    expect(result.after).toEqual(result.before);
    expect(result.cacheHit).toBe(true);
    expect(result.dimensions).toEqual({ width: 320, height: 480 });
    expect(result.pixel).toEqual([22, 163, 74, 255]);
    expect(await page.evaluate(() => window.__pageNavigationHarness!.samplePixel())).toEqual([
      22, 163, 74, 255,
    ]);
  });
}
