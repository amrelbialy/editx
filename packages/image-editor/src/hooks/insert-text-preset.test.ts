import { EditxEngine } from "@editx/engine";
import { describe, expect, it } from "vitest";
import type { TextPreset } from "../config/preset.types";
import { insertTextPreset } from "./insert-text-preset";

describe("insertTextPreset", () => {
  it.each([
    ["polygon", { kind: "polygon", sides: 2 }, "sides must be at least 3"],
    ["star", { kind: "star", points: 1 }, "points must be at least 2"],
    ["line", { kind: "line", pointerLength: -1 }, "pointerLength must be at least 0"],
    [
      "path",
      { kind: "path", pathData: "M0 0<bad>", viewBox: { width: 10, height: 10 } },
      "Invalid SVG path data",
    ],
  ] as const)("rejects invalid %s geometry before inserting any composition child", (_, shape, message) => {
    const engine = new EditxEngine();
    const pageId = engine.block.create("page");
    engine.clearHistory();
    const preset: TextPreset = {
      id: "invalid-shape",
      label: "Invalid shape",
      blocks: [{ text: "Must not be inserted" }],
      composition: {
        elements: [
          {
            kind: "text",
            block: 0,
            layout: { x: 0, y: 0, width: 0.5, height: 0.1 },
          },
          {
            kind: "shape",
            layout: { x: 0, y: 0.2, width: 0.5, height: 0.5 },
            shape,
            fill: { kind: "color", color: "#000000" },
          },
        ],
      },
      preview: { kind: "text", sample: "Invalid" },
    };

    expect(() =>
      insertTextPreset(
        {
          engine,
          pageId,
          pageW: 100,
          pageH: 100,
          scaleFactor: 1,
          config: {},
        },
        preset,
      ),
    ).toThrow(message);
    expect(engine.block.getChildren(pageId)).toEqual([]);
    expect(engine.canUndo()).toBe(false);

    const nextId = engine.block.create("graphic");
    expect(engine.canUndo()).toBe(true);
    engine.undo();
    expect(engine.block.exists(nextId)).toBe(false);
  });
});
