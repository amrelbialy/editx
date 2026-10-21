import { describe, expect, it } from "vitest";
import { layoutContinuousPages } from "./konva-page-layout";

const pages = [
  { id: 1, width: 100, height: 80 },
  { id: 2, width: 200, height: 120 },
  { id: 3, width: 60, height: 160 },
];

describe("continuous page layout", () => {
  it("centers mixed pages vertically with exact 80-unit gaps", () => {
    const layout = layoutContinuousPages("vertical-pages", pages);
    expect([...layout.bounds.entries()]).toEqual([
      [1, { x: 50, y: 0, width: 100, height: 80 }],
      [2, { x: 0, y: 160, width: 200, height: 120 }],
      [3, { x: 70, y: 360, width: 60, height: 160 }],
    ]);
    expect(layout).toMatchObject({ width: 200, height: 520 });
  });

  it("centers mixed pages horizontally with exact 80-unit gaps", () => {
    const layout = layoutContinuousPages("horizontal-pages", pages);
    expect([...layout.bounds.entries()]).toEqual([
      [1, { x: 0, y: 40, width: 100, height: 80 }],
      [2, { x: 180, y: 20, width: 200, height: 120 }],
      [3, { x: 460, y: 0, width: 60, height: 160 }],
    ]);
    expect(layout).toMatchObject({ width: 520, height: 160 });
  });
});
