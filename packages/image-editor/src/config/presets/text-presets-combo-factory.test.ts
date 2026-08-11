import { describe, expect, it } from "vitest";
import { combo } from "./text-presets-combo-factory";
import { combinations } from "./text-presets-combos";
import { boxedCombos } from "./text-presets-combos-boxed";

const EM = 24 / 1080;

describe("combo() text-preset factory", () => {
  it("puts every line in one shared column", () => {
    const preset = combo({
      id: "c",
      label: "C",
      width: 0.6,
      lines: [{ text: "One", scale: 3 }, { text: "Two" }],
    });

    expect(preset.blocks).toHaveLength(2);
    for (const block of preset.blocks) {
      expect(block.x).toBeCloseTo(0.2, 5); // (1 - 0.6) / 2
      expect(block.width).toBe(0.6);
      expect(block.align).toBe("center");
    }
  });

  it("stacks lines with heights derived from their font scale", () => {
    const preset = combo({
      id: "c",
      label: "C",
      lines: [{ text: "Head", scale: 3 }, { text: "Sub" }],
    });

    const [head, sub] = preset.blocks;
    expect(head.height).toBeCloseTo(3 * 1.2 * EM, 4);
    expect(sub.height).toBeCloseTo(1.2 * EM, 4);
    // The next line starts exactly where the previous one ends (no gap set).
    expect(sub.y).toBeCloseTo((head.y ?? 0) + (head.height ?? 0), 4);
  });

  it("centres the stack vertically on centerY", () => {
    const preset = combo({
      id: "c",
      label: "C",
      centerY: 0.8,
      lines: [{ text: "A", scale: 2 }, { text: "B" }],
    });

    const total = preset.blocks.reduce((sum, block) => sum + (block.height ?? 0), 0);
    expect(preset.blocks[0].y).toBeCloseTo(0.8 - total / 2, 4);
  });

  it("adds a gap measured in ems of the line's own font size", () => {
    const preset = combo({
      id: "c",
      label: "C",
      lines: [{ text: "A" }, { text: "B", scale: 2, gap: 0.5 }],
    });

    const [a, b] = preset.blocks;
    expect((b.y ?? 0) - ((a.y ?? 0) + (a.height ?? 0))).toBeCloseTo(0.5 * 2 * EM, 4);
  });

  it("counts wrapped-in newline rows toward the block height", () => {
    const preset = combo({ id: "c", label: "C", lines: [{ text: "One\nTwo\nThree" }] });

    expect(preset.blocks[0].height).toBeCloseTo(3 * 1.2 * EM, 4);
  });

  it("defaults the preview sample to the joined lines", () => {
    const preset = combo({ id: "c", label: "C", lines: [{ text: "A" }, { text: "B" }] });

    expect(preset.preview).toEqual({ kind: "text", sample: "A\nB" });
  });

  it("honours a per-line align override and an explicit sample", () => {
    const preset = combo({
      id: "c",
      label: "C",
      align: "left",
      sample: "A",
      lines: [{ text: "A" }, { text: "B", align: "right" }],
    });

    expect(preset.blocks[0].align).toBe("left");
    expect(preset.blocks[1].align).toBe("right");
    expect(preset.preview).toEqual({ kind: "text", sample: "A" });
  });

  it("carries an authored background box through onto the emitted block", () => {
    const preset = combo({
      id: "c",
      label: "C",
      lines: [
        {
          text: "Boxed",
          backgroundBox: {
            color: "#ffffff",
            padding: { top: 4, left: 8 },
            cornerRadius: 6,
            shadow: { color: "#000000", offsetX: 10, offsetY: 10, blur: 0 },
            stroke: { color: "#111827", width: 2 },
          },
        },
        { text: "Plain" },
      ],
    });

    expect(preset.blocks[0].backgroundBox).toEqual({
      color: "#ffffff",
      padding: { top: 4, left: 8 },
      cornerRadius: 6,
      shadow: { color: "#000000", offsetX: 10, offsetY: 10, blur: 0 },
      stroke: { color: "#111827", width: 2 },
    });
    expect(preset.blocks[1].backgroundBox).toBeUndefined();
    // Box authoring must not disturb the derived stack geometry.
    expect(preset.blocks[0].height).toBeCloseTo(1.2 * EM, 4);
  });
});

describe("boxed text combinations", () => {
  const byId = new Map(boxedCombos.map((preset) => [preset.id, preset]));

  it("registers the box-style presets in the combinations catalog", () => {
    const catalogIds = combinations.map((preset) => preset.id);
    expect(catalogIds).toEqual(expect.arrayContaining(["promo-code", "text-box", "breaking-news"]));
  });

  it("puts a white card with a hard offset shadow on the promo-code headline", () => {
    const box = byId.get("promo-code")?.blocks[1].backgroundBox;
    expect(box?.color).toBe("#ffffff");
    expect(box?.cornerRadius).toBeGreaterThan(0);
    expect(box?.shadow).toEqual({ color: "#000000", offsetX: 14, offsetY: 14, blur: 0 });
    // The kicker sits above the card, unboxed.
    expect(byId.get("promo-code")?.blocks[0].backgroundBox).toBeUndefined();
  });

  it("boxes every left-aligned line of text-box", () => {
    const preset = byId.get("text-box");
    expect(preset?.blocks).toHaveLength(3);
    for (const block of preset?.blocks ?? []) {
      expect(block.align).toBe("left");
      expect(block.backgroundBox).toEqual({ color: "#dbeafe", padding: 14, cornerRadius: 8 });
    }
  });

  it("gives breaking-news a red ticker bar above an unboxed headline", () => {
    const [ticker, headline] = byId.get("breaking-news")?.blocks ?? [];
    expect(ticker.backgroundBox?.color).toBe("#dc2626");
    expect(ticker.textTransform).toBe("uppercase");
    expect(headline.backgroundBox).toBeUndefined();
    expect(headline.fontSizeScale).toBeGreaterThan(ticker.fontSizeScale ?? 1);
  });
});
