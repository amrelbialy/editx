import { describe, expect, it } from "vitest";
import { createThumbnailEngine } from "./__tests__/mocks/page-thumbnail-engine";
import { IMAGE_SRC } from "./block/property-keys";

describe("page thumbnail cache", () => {
  it("reuses identical requests and keeps variants separate", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const first = await engine.exportPageThumbnail(page);
    expect(
      await engine.exportPageThumbnail(page, {
        maxWidth: 256,
        maxHeight: 256,
        format: "png",
        quality: 0.92,
      }),
    ).toBe(first);
    const size = await engine.exportPageThumbnail(page, { maxWidth: 100 });
    const format = await engine.exportPageThumbnail(page, { format: "jpeg" });
    const quality = await engine.exportPageThumbnail(page, { quality: 0.5 });
    expect(new Set([first, size, format, quality]).size).toBe(4);
    expect(render).toHaveBeenCalledTimes(4);
  });

  it("invalidates only the page whose descendant changed", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const child = engine.block.addText(page, 0, 0, 100, 40, "Hello");
    const other = engine.scene.addPage({ width: 200, height: 400 });
    const first = await engine.exportPageThumbnail(page);
    const otherFirst = await engine.exportPageThumbnail(other);
    engine.block.setPosition(child, 10, 20);
    expect(await engine.exportPageThumbnail(other)).toBe(otherFirst);
    expect(await engine.exportPageThumbnail(page)).not.toBe(first);
    expect(render).toHaveBeenCalledTimes(3);
  });

  it("includes page properties, text styles, shape, fill, effects, image sources and visibility", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const text = engine.block.addText(page, 0, 0, 100, 40, "Hello");
    const graphic = engine.block.addShape(page, "rect", "Graphic", 0, 0, 100, 100);
    const effect = engine.block.createEffect("adjustments");
    engine.block.appendEffect(graphic, effect);
    const image = engine.block.addImage(page, "first.png", 0, 0, 100, 100, 100, 100);
    const changes = [
      () => engine.scene.resizePage(page, 400, 800),
      () => engine.scene.setPageProperties(page, { backgroundColor: { r: 1, g: 0, b: 0, a: 1 } }),
      () =>
        engine.scene.setPageProperties(page, { name: "Cover", metadata: { alt: "Cover preview" } }),
      () => engine.block.setTextFontFamily(text, 0, 5, "Test Font"),
      () => engine.block.setShapeGeometry(graphic, { type: "ellipse" }),
      () => engine.block.setFillSolidColor(graphic, { r: 0, g: 1, b: 0, a: 1 }),
      () => engine.block.setAdjustmentValue(effect, "brightness", 0.2),
      () => engine.block.setString(image, IMAGE_SRC, "second.png"),
      () => engine.block.setVisible(graphic, false),
    ];
    let previous = await engine.exportPageThumbnail(page);
    for (const change of changes) {
      change();
      const next = await engine.exportPageThumbnail(page);
      expect(next).not.toBe(previous);
      previous = next;
    }
    expect(render).toHaveBeenCalledTimes(changes.length + 1);
  });

  it("tracks shared rendering dependencies on every owning page", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const other = engine.scene.addPage();
    const firstGraphic = engine.block.addShape(page, "rect", "One", 0, 0, 10, 10);
    const secondGraphic = engine.block.addShape(other, "rect", "Two", 0, 0, 10, 10);
    const sharedFill = engine.block.createFill("color");
    engine.block.setFill(firstGraphic, sharedFill);
    engine.block.setFill(secondGraphic, sharedFill);
    const first = await engine.exportPageThumbnail(page);
    const second = await engine.exportPageThumbnail(other);
    engine.block.setFillSolidColor(firstGraphic, { r: 1, g: 0, b: 0, a: 1 });
    expect(await engine.exportPageThumbnail(page)).not.toBe(first);
    expect(await engine.exportPageThumbnail(other)).not.toBe(second);
    expect(render).toHaveBeenCalledTimes(4);
  });

  it("ignores navigation, camera, selection and scene page order", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const child = engine.block.addText(page, 0, 0, 100, 40, "Hello");
    const other = engine.scene.addPage();
    const first = await engine.exportPageThumbnail(page);
    engine.setActivePage(page);
    engine.block.select(child);
    engine.editor.setZoom(2);
    engine.editor.panTo(20, 40);
    engine.scene.movePage(other, 0);
    expect(await engine.exportPageThumbnail(page)).toBe(first);
    expect(render).toHaveBeenCalledOnce();
  });

  it("evicts the least recently used successful result after 64 entries", async () => {
    const { engine, render, page } = await createThumbnailEngine();
    const first = await engine.exportPageThumbnail(page, { maxWidth: 1 });
    const second = await engine.exportPageThumbnail(page, { maxWidth: 2 });
    for (let width = 3; width <= 64; width++)
      await engine.exportPageThumbnail(page, { maxWidth: width });
    expect(await engine.exportPageThumbnail(page, { maxWidth: 1 })).toBe(first);
    await engine.exportPageThumbnail(page, { maxWidth: 65 });
    expect(await engine.exportPageThumbnail(page, { maxWidth: 1 })).toBe(first);
    expect(await engine.exportPageThumbnail(page, { maxWidth: 2 })).not.toBe(second);
    expect(render).toHaveBeenCalledTimes(66);
  });

  it("does not share cache entries between engine instances", async () => {
    const first = await createThumbnailEngine();
    const second = await createThumbnailEngine();
    const firstBlob = await first.engine.exportPageThumbnail(first.page);
    expect(await second.engine.exportPageThumbnail(second.page)).not.toBe(firstBlob);
    expect(first.render).toHaveBeenCalledOnce();
    expect(second.render).toHaveBeenCalledOnce();
  });
});
