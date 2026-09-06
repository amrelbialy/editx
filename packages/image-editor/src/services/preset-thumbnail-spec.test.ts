import { describe, expect, it } from "vitest";
import type { ShapePreset, TextPreset } from "../config/config.types";
import { getPresetThumbnailFingerprint, PRESET_THUMBNAIL_EXPORT } from "./preset-thumbnail-spec";

const textPreset: TextPreset = {
  id: "title",
  label: "Title",
  blocks: [{ text: "Title", fontSizeScale: 2 }],
};
const shapePreset: ShapePreset = {
  id: "rect",
  label: "Rectangle",
  shape: { kind: "rect" },
  fill: { kind: "color" },
};

describe("preset thumbnail specification", () => {
  it("uses the committed PNG dimensions", () => {
    expect(PRESET_THUMBNAIL_EXPORT).toEqual({
      width: 128,
      height: 72,
      padding: 4,
      pixelRatio: 2,
    });
  });

  it("ignores display metadata and unrelated config", () => {
    const original = getPresetThumbnailFingerprint(textPreset, {});
    const renamed = getPresetThumbnailFingerprint(
      { ...textPreset, id: "renamed", label: "Renamed", preview: { kind: "text" } },
      { locale: "fr", text: { minFontSize: 8 } },
    );

    expect(renamed).toBe(original);
  });

  it("changes when effective text rendering changes", () => {
    const original = getPresetThumbnailFingerprint(textPreset, {});

    expect(getPresetThumbnailFingerprint(textPreset, { text: { defaultFontSize: 32 } })).not.toBe(
      original,
    );
    expect(getPresetThumbnailFingerprint(textPreset, { text: { fonts: ["Georgia"] } })).not.toBe(
      original,
    );
  });

  it("ignores default line height for single-line text", () => {
    const compact = getPresetThumbnailFingerprint(textPreset, {
      text: { defaultLineHeight: 1.1 },
    });
    const spacious = getPresetThumbnailFingerprint(textPreset, {
      text: { defaultLineHeight: 1.5 },
    });

    expect(spacious).toBe(compact);
  });

  it("includes default line height when authored multiline text inherits it", () => {
    const multiline: TextPreset = {
      ...textPreset,
      blocks: [{ text: "First\nSecond", fontSizeScale: 2 }],
    };

    expect(getPresetThumbnailFingerprint(multiline, { text: { defaultLineHeight: 1.5 } })).not.toBe(
      getPresetThumbnailFingerprint(multiline, { text: { defaultLineHeight: 1.1 } }),
    );
  });

  it("ignores the default when multiline text declares its own line height", () => {
    const multiline: TextPreset = {
      ...textPreset,
      blocks: [{ text: "First\nSecond", fontSizeScale: 2, lineHeight: 1.2 }],
    };

    expect(getPresetThumbnailFingerprint(multiline, { text: { defaultLineHeight: 1.5 } })).toBe(
      getPresetThumbnailFingerprint(multiline, { text: { defaultLineHeight: 1.1 } }),
    );
  });

  it("changes when effective shape rendering changes", () => {
    const original = getPresetThumbnailFingerprint(shapePreset, {});

    expect(getPresetThumbnailFingerprint(shapePreset, { shapes: { defaultSize: 0.4 } })).not.toBe(
      original,
    );
  });
});
