import type { PageViewBounds, RendererPageViewPage } from "../page-view";

export const CONTINUOUS_PAGE_GAP = 48;

export interface ContinuousPageLayout {
  readonly bounds: ReadonlyMap<number, PageViewBounds>;
  readonly width: number;
  readonly height: number;
}

export function layoutContinuousPages(
  mode: "vertical-pages" | "horizontal-pages",
  pages: readonly RendererPageViewPage[],
): ContinuousPageLayout {
  const bounds = new Map<number, PageViewBounds>();
  if (pages.length === 0) return { bounds, width: 0, height: 0 };

  if (mode === "vertical-pages") {
    const width = Math.max(...pages.map((page) => page.width));
    let y = 0;
    for (const page of pages) {
      bounds.set(page.id, {
        x: (width - page.width) / 2,
        y,
        width: page.width,
        height: page.height,
      });
      y += page.height + CONTINUOUS_PAGE_GAP;
    }
    return { bounds, width, height: y - CONTINUOUS_PAGE_GAP };
  }

  const height = Math.max(...pages.map((page) => page.height));
  let x = 0;
  for (const page of pages) {
    bounds.set(page.id, {
      x,
      y: (height - page.height) / 2,
      width: page.width,
      height: page.height,
    });
    x += page.width + CONTINUOUS_PAGE_GAP;
  }
  return { bounds, width: x - CONTINUOUS_PAGE_GAP, height };
}
