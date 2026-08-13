import { EditxEngine } from "@editx/engine";
import { describe, expect, it } from "vitest";
import type { TextPreset } from "../config/preset.types";
import { insertTextPreset } from "./insert-text-preset";

describe("insertTextPreset", () => {
  it("closes the batch after malformed shape insertion so later history commits", () => {
    const engine = new EditxEngine();
    const pageId = engine.block.create("page");
    engine.clearHistory();
    const preset: TextPreset = {
      id: "invalid-path",
      label: "Invalid path",
      blocks: [],
      composition: {
        elements: [
          {
            kind: "shape",
            layout: { x: 0, y: 0, width: 0.5, height: 0.5 },
            shape: { kind: "path", pathData: "M0 0<bad>" },
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
    ).toThrow("Invalid SVG path data");
    expect(engine.canUndo()).toBe(false);

    const nextId = engine.block.create("graphic");
    expect(engine.canUndo()).toBe(true);
    engine.undo();
    expect(engine.block.exists(nextId)).toBe(false);
  });
});
