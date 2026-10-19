import {
  expect,
  test,
  type ComponentFixtures,
} from "@playwright/experimental-ct-react";
import {
  expectPixel,
  routeBroken,
  routeControlledSvg,
  routeSvg,
} from "./page-export.assertions";
import { PageExportFixture } from "./page-export.component";

async function mountFixture(
  mount: ComponentFixtures["mount"],
) {
  const component = await mount(<PageExportFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
  return component;
}

test.describe("engine.exportPage in a real browser", () => {
  test("isolates inactive artwork, dimensions, background, clipping and group order", async ({
    mount,
    page,
  }) => {
    await mountFixture(mount);
    const result = await page.evaluate(() => {
      const harness = window.__pageExportHarness;
      if (!harness) throw new Error("fixture unavailable");
      const ids = harness.ids();
      return Promise.all([
        harness.exportDecoded(ids.target, undefined, [
          [1, 1],
          [10, 10],
          [39, 0],
          [39, 29],
        ]),
        harness.exportDecoded(ids.transparent, undefined, [[6, 3]]),
        harness.exportDecoded(ids.active, undefined, [[70, 40]]),
      ]);
    });

    expect(result[0]).toMatchObject({ mime: "image/png", width: 40, height: 30 });
    expectPixel(result[0].pixels["1,1"], [255, 0, 0, 255]);
    expectPixel(result[0].pixels["10,10"], [0, 255, 0, 255]);
    expectPixel(result[0].pixels["39,0"], [26, 51, 77, 255]);
    expectPixel(result[0].pixels["39,29"], [255, 255, 0, 255]);
    expect(result[1]).toMatchObject({ width: 13, height: 7 });
    expectPixel(result[1].pixels["6,3"], [0, 0, 0, 0]);
    expect(result[2]).toMatchObject({ width: 80, height: 50 });
    expectPixel(result[2].pixels["70,40"], [255, 0, 255, 255]);
  });

  test("encodes png/jpeg/webp at the requested pixel ratios", async ({ mount, page }) => {
    await mountFixture(mount);
    const results = await page.evaluate(async () => {
      const harness = window.__pageExportHarness;
      if (!harness) throw new Error("fixture unavailable");
      const id = harness.ids().target;
      return Promise.all([
        harness.exportDecoded(id, { format: "png", pixelRatio: 2 }),
        harness.exportDecoded(id, { format: "jpeg", quality: 0.4 }),
        harness.exportDecoded(id, { format: "webp", quality: 0.7, pixelRatio: 1.5 }),
      ]);
    });

    expect(results).toEqual([
      expect.objectContaining({ mime: "image/png", width: 80, height: 60 }),
      expect.objectContaining({ mime: "image/jpeg", width: 40, height: 30 }),
      expect.objectContaining({ mime: "image/webp", width: 60, height: 45 }),
    ]);
  });

  test("preserves navigation, selection, camera, redo, group context and crop preview", async ({
    mount,
    page,
  }) => {
    await mountFixture(mount);
    const states = await page.evaluate(async () => {
      const harness = window.__pageExportHarness;
      if (!harness) throw new Error("fixture unavailable");
      const before = await harness.preparePreservation();
      await harness.exportDecoded(harness.ids().target);
      return { before, after: harness.readState() };
    });

    expect(states.before.editMode).toBe("Crop");
    expect(states.before.crop).not.toBeNull();
    expect(states.before.canRedo).toBe(true);
    expect(states.before.groupContext).toHaveLength(1);
    expect(states.before.selection).toHaveLength(1);
    expect(states.after).toEqual(states.before);
  });

  test("captures before delayed assets and runs concurrent exports independently", async ({
    mount,
    page,
  }) => {
    const red = await routeControlledSvg(page, "/slow-red.svg", "#ff0000");
    const green = await routeControlledSvg(page, "/slow-green.svg", "#00ff00");
    const cyan = await routeControlledSvg(page, "/slow-cyan.svg", "#00ffff");
    await routeSvg(page, "/replacement.svg", "#0000ff");
    await mountFixture(mount);
    const pages = await page.evaluate(() => {
      const harness = window.__pageExportHarness;
      if (!harness) throw new Error("fixture unavailable");
      return {
        red: harness.addAssetPage("image", "/slow-red.svg"),
        green: harness.addAssetPage("fill", "/slow-green.svg"),
        cyan: harness.addAssetPage("background", "/slow-cyan.svg"),
      };
    });
    const pending = page.evaluate(async ({ redPage, greenPage, cyanPage }) => {
      const harness = window.__pageExportHarness;
      if (!harness) throw new Error("fixture unavailable");
      return Promise.all([
        harness.exportDecoded(redPage, undefined, [[8, 6]]),
        harness.exportDecoded(greenPage, undefined, [[8, 6]]),
        harness.exportDecoded(cyanPage, undefined, [[8, 6]]),
      ]);
    }, {
      redPage: pages.red.pageId,
      greenPage: pages.green.pageId,
      cyanPage: pages.cyan.pageId,
    });

    await Promise.all([red.requested, green.requested, cyan.requested]);
    await page.evaluate(({ blockId }) => {
      window.__pageExportHarness?.setImageSource(blockId, "/replacement.svg");
    }, { blockId: pages.red.blockId });
    red.release();
    green.release();
    cyan.release();
    const results = await pending;
    expectPixel(results[0].pixels["8,6"], [255, 0, 0, 255]);
    expectPixel(results[1].pixels["8,6"], [0, 255, 0, 255]);
    expectPixel(results[2].pixels["8,6"], [0, 255, 255, 255]);
  });

  test("identifies target image/font failures and ignores unrelated failed assets", async ({
    mount,
    page,
  }) => {
    await routeBroken(page, "/missing-target.svg");
    await routeBroken(page, "/missing-font.woff2");
    await routeBroken(page, "/unrelated.svg");
    await mountFixture(mount);
    const result = await page.evaluate(async () => {
      const harness = window.__pageExportHarness;
      if (!harness) throw new Error("fixture unavailable");
      const image = harness.addAssetPage("image", "/missing-target.svg");
      const font = harness.addFontPage("A6BrokenRegistered", "/missing-font.woff2");
      harness.addAssetPage("fill", "/unrelated.svg");
      return {
        image: await harness.exportFailure(image.pageId),
        font: await harness.exportFailure(font.pageId),
        unrelated: await harness.exportDecoded(harness.ids().target, undefined, [[39, 0]]),
        imageIds: image,
        fontIds: font,
      };
    });

    expect(result.image).toMatchObject({
      name: "PageExportError",
      code: "IMAGE_LOAD_FAILED",
      pageId: result.imageIds.pageId,
      blockId: result.imageIds.blockId,
      resource: "/missing-target.svg",
    });
    expect(result.image.cause).not.toBe("undefined");
    expect(result.font).toMatchObject({
      name: "PageExportError",
      code: "FONT_LOAD_FAILED",
      pageId: result.fontIds.pageId,
      blockId: result.fontIds.blockId,
      resource: "A6BrokenRegistered",
    });
    expect(result.font.cause).not.toBe("undefined");
    expect(result.unrelated).toMatchObject({ width: 40, height: 30 });
    expectPixel(result.unrelated.pixels["39,0"], [26, 51, 77, 255]);
  });
});
