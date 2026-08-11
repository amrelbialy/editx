import { describe, expect, it } from "vitest";
import { style } from "./text-presets-style-factory";

describe("style() text-preset factory", () => {
  it("emits a single block with NO layout geometry", () => {
    const preset = style({ id: "s", label: "S", text: "Hello", block: {} });

    expect(preset.blocks).toHaveLength(1);
    const block = preset.blocks[0];
    expect(block.x).toBeUndefined();
    expect(block.y).toBeUndefined();
    expect(block.width).toBeUndefined();
    expect(block.height).toBeUndefined();
  });

  it("preserves text and defaults fontSizeScale to 2.5", () => {
    const preset = style({ id: "s", label: "S", text: "Hello", block: {} });

    expect(preset.id).toBe("s");
    expect(preset.label).toBe("S");
    expect(preset.blocks[0].text).toBe("Hello");
    expect(preset.blocks[0].fontSizeScale).toBe(2.5);
  });

  it("uses the provided scale when set", () => {
    const preset = style({ id: "s", label: "S", text: "Big", scale: 3, block: {} });

    expect(preset.blocks[0].fontSizeScale).toBe(3);
  });

  it("spreads block style fields onto the block (no geometry introduced)", () => {
    const preset = style({
      id: "elegant",
      label: "Elegant",
      text: "Elegant",
      block: {
        fontFamily: "Times New Roman",
        fontStyle: "italic",
        fontWeight: "normal",
        fill: "#1f2937",
        letterSpacing: 2,
      },
    });

    const block = preset.blocks[0];
    expect(block.fontFamily).toBe("Times New Roman");
    expect(block.fontStyle).toBe("italic");
    expect(block.fontWeight).toBe("normal");
    expect(block.fill).toBe("#1f2937");
    expect(block.letterSpacing).toBe(2);
    // Geometry stays absent even when style fields are spread.
    expect(block.x).toBeUndefined();
    expect(block.height).toBeUndefined();
  });

  it("derives a text preview from the sample text", () => {
    const preset = style({ id: "s", label: "S", text: "Sample", block: {} });

    expect(preset.preview).toEqual({ kind: "text", sample: "Sample" });
  });
});
