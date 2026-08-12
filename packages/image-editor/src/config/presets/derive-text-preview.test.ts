import { describe, expect, it } from "vitest";
import type { TextPreset, TextPresetBlock } from "../config.types";
import { deriveTextPreview, resolveTextPreview } from "./derive-text-preview";

/**
 * The preview is derived from the block's real style so it tracks the inserted
 * result. Scale-dependent effects are `em` relative to the block's reference
 * font size (24 × fontSizeScale), matching how the canvas scales them.
 */
function block(overrides: Partial<TextPresetBlock>): TextPresetBlock {
  return { text: "Sample", x: 0, y: 0, width: 0.5, height: 0.1, ...overrides };
}

function textStyle(preview: ReturnType<typeof deriveTextPreview>) {
  if (preview.kind !== "text") throw new Error("expected text preview");
  return preview.style ?? {};
}

describe("deriveTextPreview", () => {
  it("expresses letterSpacing in em relative to the reference font", () => {
    // refPx = 24 * 2 = 48 → 6 / 48 = 0.125em
    const preview = deriveTextPreview(block({ fontSizeScale: 2, letterSpacing: 6 }));
    expect(textStyle(preview).letterSpacing).toBe("0.125em");
  });

  it("expresses text stroke width in em with its colour", () => {
    // refPx = 24 * 3 = 72 → 2 / 72 ≈ 0.028em
    const preview = deriveTextPreview(
      block({ fontSizeScale: 3, textStrokeWidth: 2, textStrokeColor: "#ffffff" }),
    );
    expect(textStyle(preview).textStroke).toBe("0.028em #ffffff");
  });

  it("expresses shadow offsets/blur in em proportional to the block", () => {
    // refPx = 24 * 3 = 72 → 3/72 ≈ 0.042em, 6/72 ≈ 0.083em
    const preview = deriveTextPreview(
      block({
        fontSizeScale: 3,
        textShadowColor: "#000000",
        textShadowBlur: 6,
        textShadowOffsetX: 3,
        textShadowOffsetY: 3,
      }),
    );
    expect(textStyle(preview).textShadow).toBe("0.042em 0.042em 0.083em #000000");
  });

  it("produces a CSS gradient string for a gradient block", () => {
    const preview = deriveTextPreview(
      block({
        fillGradient: {
          type: "linear",
          angle: 90,
          stops: [
            { offset: 0, color: "#f97316" },
            { offset: 1, color: "#ef4444" },
          ],
        },
      }),
    );
    expect(textStyle(preview).textGradient).toBe(
      "linear-gradient(90deg, #f97316 0%, #ef4444 100%)",
    );
    // Gradient wins over solid colour.
    expect(textStyle(preview).color).toBeUndefined();
  });

  it("maps a highlight block to a background colour", () => {
    const preview = deriveTextPreview(block({ backgroundColor: "#fde68a" }));
    expect(textStyle(preview).background).toBe("#fde68a");
  });

  it("maps a block-level background box onto em-relative box CSS", () => {
    // refPx = 24 * 2 = 48 → 12/48 = 0.25em, 6/48 = 0.125em, 2/48 ≈ 0.042em
    const preview = deriveTextPreview(
      block({
        fontSizeScale: 2,
        backgroundBox: {
          color: "#ffffff",
          padding: 12,
          cornerRadius: 6,
          shadow: { color: "#000000", offsetX: 12, offsetY: 12, blur: 0 },
          stroke: { color: "#111827", width: 2 },
        },
      }),
    );

    expect(textStyle(preview).box).toEqual({
      background: "#ffffff",
      padding: "0.25em 0.25em 0.25em 0.25em",
      borderRadius: "0.125em",
      boxShadow: "0.25em 0.25em 0em #000000",
      border: "0.042em solid #111827",
    });
    // The run-level highlight pill stays untouched.
    expect(textStyle(preview).background).toBeUndefined();
  });

  it("expands per-side box padding, defaulting omitted sides to zero", () => {
    const preview = deriveTextPreview(
      block({ backgroundBox: { color: "#dc2626", padding: { top: 12, left: 24 } } }),
    );
    expect(textStyle(preview).box?.padding).toBe("0.5em 0em 0em 1em");
  });

  it("carries font family / weight / style / transform through", () => {
    const preview = deriveTextPreview(
      block({
        fontFamily: "Georgia",
        fontWeight: "bold",
        fontStyle: "italic",
        textTransform: "uppercase",
      }),
    );
    const style = textStyle(preview);
    expect(style.fontFamily).toBe("Georgia");
    expect(style.fontWeight).toBe("bold");
    expect(style.fontStyle).toBe("italic");
    expect(style.textTransform).toBe("uppercase");
  });

  it("prefers transform over deprecated textTransform", () => {
    const preview = deriveTextPreview(
      block({ transform: "lowercase", textTransform: "uppercase" }),
    );
    expect(textStyle(preview).textTransform).toBe("lowercase");
  });

  it("does not apply block-relative run offsets to a different preview sample", () => {
    const preview = deriveTextPreview(
      block({ text: "BLOCK", runOverrides: [{ start: 0, end: 2, style: { fill: "#f00" } }] }),
      "Sample",
    );
    if (preview.kind !== "text") throw new Error("expected text preview");
    expect(preview.segments).toBeUndefined();
  });

  it("derives ordered override segments with later properties winning", () => {
    const preview = deriveTextPreview(
      block({
        text: "COLOR",
        backgroundColor: "#fde68a",
        backgroundOpacity: 0.4,
        backgroundCornerRadius: 6,
        backgroundPadding: { left: 4 },
        runOverrides: [
          { start: 1, end: 4, style: { fill: "#ef4444", fontWeight: "bold" } },
          { start: 2, end: 3, style: { fill: "#2563eb", backgroundColor: "#fff" } },
        ],
      }),
    );
    if (preview.kind !== "text") throw new Error("expected text preview");
    expect(preview.style).toMatchObject({
      background: "#fde68a",
      backgroundOpacity: 0.4,
      borderRadius: "0.25em",
      padding: "0em 0em 0em 0.167em",
    });
    expect(preview.segments).toEqual([
      {
        start: 1,
        end: 2,
        style: expect.objectContaining({ color: "#ef4444", fontWeight: "bold" }),
      },
      {
        start: 2,
        end: 3,
        style: expect.objectContaining({
          color: "#2563eb",
          fontWeight: "bold",
          background: "#fff",
        }),
      },
      {
        start: 3,
        end: 4,
        style: expect.objectContaining({ color: "#ef4444", fontWeight: "bold" }),
      },
    ]);
  });
});

describe("resolveTextPreview", () => {
  const base: TextPreset = {
    id: "p",
    label: "P",
    blocks: [block({ letterSpacing: 6, fontSizeScale: 2 })],
    preview: { kind: "text", sample: "Sample" },
  };

  it("derives when the preview has no hand-authored style", () => {
    const preview = resolveTextPreview(base);
    expect(textStyle(preview).letterSpacing).toBe("0.125em");
  });

  it("honours a consumer-supplied preview.style", () => {
    const preset: TextPreset = {
      ...base,
      preview: { kind: "text", sample: "Sample", style: { color: "#abcdef" } },
    };
    const preview = resolveTextPreview(preset);
    expect(textStyle(preview).color).toBe("#abcdef");
    // Derivation is skipped, so no derived letterSpacing.
    expect(textStyle(preview).letterSpacing).toBeUndefined();
  });

  it("keeps the preview sample when deriving (multi-line combos)", () => {
    const preset: TextPreset = {
      ...base,
      blocks: [block({ text: "Main Heading" })],
      preview: { kind: "text", sample: "Heading\nSubtitle" },
    };
    const preview = resolveTextPreview(preset);
    if (preview.kind !== "text") throw new Error("expected text");
    expect(preview.sample).toBe("Heading\nSubtitle");
  });

  it("derives from the largest block so combos show their headline style", () => {
    const preset: TextPreset = {
      ...base,
      blocks: [
        block({ text: "KICKER", fontSizeScale: 1, fill: "#f59e0b" }),
        block({ text: "Headline", fontSizeScale: 3, fill: "#ffffff" }),
      ],
      preview: { kind: "text", sample: "Headline" },
    };
    expect(textStyle(resolveTextPreview(preset)).color).toBe("#ffffff");
  });

  it("falls back to the first boxed block when the dominant one has no box", () => {
    const preset: TextPreset = {
      ...base,
      blocks: [
        block({ text: "BREAKING", fontSizeScale: 1, backgroundBox: { color: "#dc2626" } }),
        block({ text: "Headline", fontSizeScale: 3, fill: "#ffffff" }),
      ],
      preview: { kind: "text", sample: "BREAKING\nHeadline" },
    };
    const style = textStyle(resolveTextPreview(preset));
    expect(style.box?.background).toBe("#dc2626");
    // Typography still comes from the dominant block.
    expect(style.color).toBe("#ffffff");
  });

  it("leaves the preview boxless when no block has a box", () => {
    expect(textStyle(resolveTextPreview(base)).box).toBeUndefined();
  });
});
