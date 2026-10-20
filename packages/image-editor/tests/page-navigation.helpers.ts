import type { Page } from "@playwright/test";

/** Set up an offset page for editing regressions independently of the page-title UI. */
export async function focusPage(page: Page, index: number): Promise<void> {
  await page.evaluate(async (pageIndex) => {
    const { engine, ids, samplePixel } = window.__pageNavigationHarness!;
    engine.scene.setActivePage(ids[pageIndex]);
    engine.editor.fitToScreen(48);
    await samplePixel();
  }, index);
}

export async function outlineAlpha(page: Page, index: number): Promise<number> {
  return page.evaluate(async (pageIndex) => {
    const { engine, ids, samplePixel } = window.__pageNavigationHarness!;
    await samplePixel();
    const frame = engine.editor.getPageViewBounds(ids[pageIndex])!;
    const origin = engine.editor.worldToScreen({
      x: frame.x,
      y: frame.y + frame.height / 2,
    })!;
    const canvas = document.querySelectorAll<HTMLCanvasElement>(".konvajs-content canvas")[1];
    const context = canvas.getContext("2d")!;
    const ratio = canvas.width / Number.parseFloat(canvas.style.width);
    const data = context.getImageData(
      Math.round((origin.x - 3) * ratio),
      Math.round((origin.y - 3) * ratio),
      Math.ceil(6 * ratio),
      Math.ceil(6 * ratio),
    ).data;
    return data.reduce((sum, value, offset) => sum + (offset % 4 === 3 ? value : 0), 0);
  }, index);
}
