import { describe, expect, it } from "vitest";
import { styles } from "./text-presets-styles";

function textPreset(id: string) {
  const found = styles.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing preset ${id}`);
  return found;
}

function preset(id: string) {
  return textPreset(id).blocks[0];
}

describe("rich single-block text styles", () => {
  it("includes the three character-focused designs with valid authored ranges", () => {
    for (const id of ["color-pop", "glitch-cut", "editorial-switch"]) {
      const block = preset(id);
      expect(block.runOverrides?.length).toBeGreaterThan(0);
      for (const override of block.runOverrides ?? []) {
        expect(override.start).toBeGreaterThanOrEqual(0);
        expect(override.end).toBeLessThanOrEqual(block.text.length);
        expect(override.start).toBeLessThan(override.end);
      }
    }
    expect(preset("color-pop").runOverrides).toHaveLength(1);
    expect(preset("glitch-cut").runOverrides).toHaveLength(3);
  });

  it("keeps existing highlight IDs while enriching their run backgrounds", () => {
    expect(textPreset("highlight")).toMatchObject({ label: "Highlight" });
    expect(preset("highlight").text).toBe("Highlight");
    expect(preset("highlight")).toMatchObject({
      fontSizeScale: 3,
      backgroundColor: "#facc15",
      backgroundOpacity: 0.82,
      backgroundCornerRadius: 3,
    });
    expect(textPreset("sticker")).toMatchObject({ label: "Sticker" });
    expect(preset("sticker").text).toBe("Sticker");
    expect(preset("sticker")).toMatchObject({
      fontSizeScale: 3,
      backgroundColor: "#2563eb",
      backgroundCornerRadius: 18,
    });
  });

  it("uses frame-only background boxes for frame concepts", () => {
    expect(preset("ink-frame").backgroundBox).toBeDefined();
    expect(preset("offset-card").backgroundBox).toBeDefined();
    expect(preset("ink-frame").backgroundColor).toBeUndefined();
  });

  it("keeps Team restrained while Strawberry uses a mixed highlighted run", () => {
    expect(preset("team").runOverrides).toBeUndefined();
    expect(preset("strawberry")).toMatchObject({
      fontSizeScale: 3,
      fontStyle: "italic",
      textStrokeColor: "#9f1239",
    });
    expect(preset("strawberry").runOverrides).toEqual([
      expect.objectContaining({
        start: 5,
        end: 10,
        style: expect.objectContaining({
          fontFamily: "Arial Black, Arial, sans-serif",
          backgroundColor: "#fda4af",
          transform: "uppercase",
        }),
      }),
    ]);
  });
});
