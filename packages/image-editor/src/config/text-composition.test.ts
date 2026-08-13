import { describe, expect, it } from "vitest";
import type { TextPreset } from "./config.types";
import { prepareTextComposition } from "./text-composition";

function preset(overrides: Partial<TextPreset> = {}): TextPreset {
  return {
    id: "combo",
    label: "Combo",
    blocks: [{ text: "One" }, { text: "Two" }],
    composition: {
      elements: [
        { kind: "text", block: 1, layout: { x: 0.2, y: 0.4, width: 0.5, height: 0.1 } },
        {
          kind: "text",
          block: 0,
          layout: { x: 0.1, y: 0.2, width: 0.3, height: 0.1 },
          widthMode: "auto",
        },
      ],
    },
    preview: { kind: "text", sample: "One\nTwo" },
    ...overrides,
  };
}

describe("prepareTextComposition", () => {
  it("keeps authored order, defaults width mode, and derives union bounds", () => {
    const prepared = prepareTextComposition(preset());
    expect(prepared?.elements[0]).toMatchObject({ kind: "text", block: 1 });
    expect(prepared?.widthModes.get(1)).toBe("fixed");
    expect(prepared?.widthModes.get(0)).toBe("auto");
    expect(prepared?.bounds).toEqual({ x: 0.1, y: 0.2, width: 0.6, height: 0.3 });
  });

  it.each([
    [[0, 0], "invalid block reference"],
    [[0], "reference every block exactly once"],
  ])("rejects invalid references %j", (references, message) => {
    const value = preset({
      composition: {
        elements: references.map((block) => ({
          kind: "text" as const,
          block,
          layout: { x: 0, y: 0, width: 0.2, height: 0.1 },
        })),
      },
    });
    expect(() => prepareTextComposition(value)).toThrow(message);
  });

  it.each([
    "x",
    "y",
    "width",
    "height",
    "rotation",
  ] as const)("rejects block-level %s when composition owns layout", (property) => {
    const value = preset({
      blocks: [{ text: "One", [property]: 0 }, { text: "Two" }],
    });
    expect(() => prepareTextComposition(value)).toThrow("composition owns block geometry");
  });

  it.each([
    [90, { x: 0, y: 0.3, width: 0.2, height: 0.4 }],
    [-90, { x: 0.5, y: 0.3, width: 0.1, height: 0.2 }],
  ])("includes logical corners rotated %d degrees from the top left", (rotation, expected) => {
    const value = preset({
      blocks: [{ text: "One" }],
      composition: {
        elements: [
          {
            kind: "text",
            block: 0,
            layout:
              rotation > 0
                ? { x: 0.2, y: 0.3, width: 0.4, height: 0.2, rotation }
                : { x: 0.5, y: 0.5, width: 0.2, height: 0.1, rotation },
          },
        ],
      },
    });

    expect(prepareTextComposition(value)?.bounds.x).toBeCloseTo(expected.x);
    expect(prepareTextComposition(value)?.bounds.y).toBeCloseTo(expected.y);
    expect(prepareTextComposition(value)?.bounds.width).toBeCloseTo(expected.width);
    expect(prepareTextComposition(value)?.bounds.height).toBeCloseTo(expected.height);
  });
});
