import { expect, test } from "@playwright/experimental-ct-react";
import { PageExportFixture } from "./page-export.component";

test.beforeEach(async ({ mount }) => {
  const component = await mount(<PageExportFixture />);
  await expect(component.locator("output")).toHaveAttribute("data-status", "ready");
});

test("fits mixed and fractional page dimensions in the default thumbnail box", async ({ page }) => {
  const results = await page.evaluate(async () => {
    const harness = window.__pageExportHarness;
    if (!harness) throw new Error("fixture unavailable");
    const target = harness.ids().target;
    const results = [];
    for (const [width, height, ratio] of [
      [800, 400, 0.32],
      [400, 800, 0.32],
      [800, 800, 0.32],
      [800.5, 400.25, 256 / 800.5],
    ]) {
      harness.resizePage(target, width, height);
      results.push(await harness.comparePageThumbnail(target, {}, ratio));
    }
    return results;
  });
  // Fractional dimensions retain A6's canvas truncation at the derived scale.
  expect(results.map(({ thumbnail }) => [thumbnail.width, thumbnail.height])).toEqual([
    [256, 128],
    [128, 256],
    [256, 256],
    [255, 127],
  ]);
  for (const result of results) {
    expect(result.matchesPageExport).toBe(true);
    expect(result.cacheHit).toBe(true);
    expect(result.thumbnail.width).toBeLessThanOrEqual(256);
    expect(result.thumbnail.height).toBeLessThanOrEqual(256);
  }
});

test("matches PNG, JPEG and WebP page exports byte-for-byte at reduced resolution", async ({
  page,
}) => {
  const results = await page.evaluate(async () => {
    const harness = window.__pageExportHarness;
    if (!harness) throw new Error("fixture unavailable");
    const target = harness.ids().target;
    harness.resizePage(target, 800, 400);
    return Promise.all(
      (["png", "jpeg", "webp"] as const).map((format) =>
        harness.comparePageThumbnail(
          target,
          { maxWidth: 120, maxHeight: 80, format, quality: 0.65 },
          0.15,
        ),
      ),
    );
  });
  expect(results.map(({ thumbnail }) => thumbnail.mime)).toEqual([
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  for (const result of results) {
    expect(result.thumbnail).toMatchObject({ width: 120, height: 60 });
    expect(result.matchesPageExport).toBe(true);
    expect(result.cacheHit).toBe(true);
  }
});

test("never enlarges a page smaller than the thumbnail box", async ({ page }) => {
  const result = await page.evaluate(() => {
    const harness = window.__pageExportHarness;
    if (!harness) throw new Error("fixture unavailable");
    return harness.comparePageThumbnail(harness.ids().target, {}, 1);
  });
  expect(result.thumbnail).toMatchObject({ width: 40, height: 30, mime: "image/png" });
  expect(result.matchesPageExport).toBe(true);
});

test("preserves live editor state and crop preview through cache misses and hits", async ({
  page,
}) => {
  const result = await page.evaluate(async () => {
    const harness = window.__pageExportHarness;
    if (!harness) throw new Error("fixture unavailable");
    const target = harness.ids().target;
    harness.resizePage(target, 800, 400);
    const before = await harness.preparePreservation();
    const comparison = await harness.comparePageThumbnail(target, {}, 0.32);
    return { before, after: harness.readState(), comparison };
  });
  expect(result.before.editMode).toBe("Crop");
  expect(result.before.crop).not.toBeNull();
  expect(result.before.canRedo).toBe(true);
  expect(result.after).toEqual(result.before);
  expect(result.comparison.cacheHit).toBe(true);
  expect(result.comparison.matchesPageExport).toBe(true);
});
