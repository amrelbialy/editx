import type { EditxEngine } from "@editx/engine";
import { describe, expect, it, vi } from "vitest";
import type { TextPreset } from "../config/preset.types";
import { insertTextPreset } from "./insert-text-preset";

function makeEngine() {
  const block = {
    addShape: vi.fn(() => 101),
    changeFillKind: vi.fn(),
    setFillGradient: vi.fn(),
    setFillImage: vi.fn(),
    setShapeGeometry: vi.fn(),
  };
  const engine = { beginBatch: vi.fn(), endBatch: vi.fn(), block } as unknown as EditxEngine;
  return { engine, block };
}

describe("insertTextPreset composition fills", () => {
  it.each([
    [
      "gradient",
      {
        kind: "gradient",
        gradient: {
          type: "linear",
          stops: [
            { offset: 0, color: "#000000" },
            { offset: 1, color: "#ffffff" },
          ],
        },
      },
    ],
    ["image", { kind: "image", image: { src: "data:image/png;base64,AA==", mode: "crop" } }],
  ] as const)("sets %s data without replacing the fill", (kind, fill) => {
    const { engine, block } = makeEngine();
    const preset: TextPreset = {
      id: `${kind}-shape`,
      label: `${kind} shape`,
      blocks: [],
      composition: {
        elements: [
          {
            kind: "shape",
            layout: { x: 0.1, y: 0.2, width: 0.8, height: 0.2 },
            shape: { kind: "rect" },
            fill,
          },
        ],
      },
      preview: { kind: "text", sample: "Shape" },
    };

    expect(
      insertTextPreset(
        { engine, pageId: 1, pageW: 1080, pageH: 1080, scaleFactor: 1, config: {} },
        preset,
      ),
    ).toBe(101);
    expect(block.addShape.mock.calls[0][2]).toBe(kind);
    expect(block.changeFillKind).not.toHaveBeenCalled();
    if (kind === "gradient") {
      expect(block.setFillGradient).toHaveBeenCalledWith(101, fill.gradient);
      expect(block.setFillImage).not.toHaveBeenCalled();
    } else {
      expect(block.setFillImage).toHaveBeenCalledWith(101, fill.image);
      expect(block.setFillGradient).not.toHaveBeenCalled();
    }
  });
});
