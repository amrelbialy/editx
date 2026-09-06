import type { ImageEditorConfig } from "@editx/image-editor";
import { describe, expect, it } from "vitest";
import { buildEditorConfig } from "./build-editor-config";
import { BUILT_IN_RESIZE_GROUPS } from "./crop-presets";
import { DEFAULT_PLAYGROUND_CONFIG, SHAPE_PRESET_IDS } from "./playground.constants";
import type { PlaygroundConfig } from "./playground.types";

const base = (overrides: Partial<PlaygroundConfig> = {}): PlaygroundConfig => ({
  ...DEFAULT_PLAYGROUND_CONFIG,
  ...overrides,
});

describe("buildEditorConfig crop mapping", () => {
  it("maps cropAspectPresets straight through to crop.presets", () => {
    const cfg = buildEditorConfig(base({ cropAspectPresets: ["1:1", "16:9"] }));
    expect(cfg.crop?.presets).toEqual(["1:1", "16:9"]);
  });

  it("maps selected resize group labels to the matching full resize preset groups", () => {
    const cfg = buildEditorConfig(base({ cropResizeGroups: ["Instagram", "YouTube"] }));

    const labels = cfg.crop?.resizePresets?.map((g) => g.label);
    expect(labels).toEqual(["Instagram", "YouTube"]);

    // The full group objects (labels + preset dimensions) are preserved.
    const instagram = BUILT_IN_RESIZE_GROUPS.find((g) => g.label === "Instagram");
    expect(cfg.crop?.resizePresets?.[0]).toEqual(instagram);
  });

  it("preserves the built-in resize group order regardless of selection order", () => {
    const cfg = buildEditorConfig(base({ cropResizeGroups: ["YouTube", "Instagram"] }));
    expect(cfg.crop?.resizePresets?.map((g) => g.label)).toEqual(["Instagram", "YouTube"]);
  });

  it("yields an empty resize preset list when no groups are selected", () => {
    const cfg = buildEditorConfig(base({ cropResizeGroups: [] }));
    expect(cfg.crop?.resizePresets).toEqual([]);
  });

  it("forwards the crop boolean toggles", () => {
    const cfg = buildEditorConfig(base({ cropAllowCustomRatio: false, cropShowRotateFlip: false }));
    expect(cfg.crop?.allowCustomRatio).toBe(false);
    expect(cfg.crop?.showRotateFlip).toBe(false);
  });

  it("never emits the deprecated modes/defaultMode fields", () => {
    const cfg = buildEditorConfig(base());
    const crop = cfg.crop as Record<string, unknown>;
    expect("modes" in crop).toBe(false);
    expect("defaultMode" in crop).toBe(false);
  });

  it("does not emit a ui.contextualBar field", () => {
    const cfg = buildEditorConfig(base());
    const ui = (cfg.ui ?? {}) as Record<string, unknown>;
    expect("contextualBar" in ui).toBe(false);
  });

  it("produces a config object assignable to ImageEditorConfig", () => {
    const cfg: ImageEditorConfig = buildEditorConfig(base());
    expect(cfg.crop?.presets?.length).toBeGreaterThan(0);
  });
});

describe("buildEditorConfig shape mapping", () => {
  it("omits presets for the canonical default selection", () => {
    const cfg = buildEditorConfig(base({ shapesPresets: [...SHAPE_PRESET_IDS] }));

    expect("presets" in (cfg.shapes ?? {})).toBe(false);
  });

  it("includes presets for a narrowed selection", () => {
    const shapesPresets = SHAPE_PRESET_IDS.slice(0, 2);
    const cfg = buildEditorConfig(base({ shapesPresets }));

    expect(cfg.shapes?.presets).toEqual(shapesPresets);
  });
});

describe("buildEditorConfig text mapping", () => {
  it("keeps the canonical line height used by static built-in thumbnails", () => {
    const cfg = buildEditorConfig(base());

    expect(cfg.text?.defaultLineHeight).toBe(1.1);
  });
});
