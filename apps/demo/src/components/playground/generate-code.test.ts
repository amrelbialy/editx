import { describe, expect, it } from "vitest";
import { generatePlaygroundCode } from "./generate-code";
import { DEFAULT_PLAYGROUND_CONFIG } from "./playground.constants";
import type { PlaygroundConfig } from "./playground.types";

const base = (overrides: Partial<PlaygroundConfig> = {}): PlaygroundConfig => ({
  ...DEFAULT_PLAYGROUND_CONFIG,
  ...overrides,
});

describe("generatePlaygroundCode crop serialization", () => {
  it("omits the crop block entirely when the config matches defaults", () => {
    const code = generatePlaygroundCode(base());
    expect(code).not.toContain("crop:");
  });

  it("serializes a custom aspect preset list as a string array", () => {
    const code = generatePlaygroundCode(base({ cropAspectPresets: ["1:1", "16:9"] }));
    expect(code).toContain("crop: {");
    expect(code).toContain('presets: ["1:1", "16:9"],');
  });

  it("serializes selected resize groups as full object literals", () => {
    const code = generatePlaygroundCode(base({ cropResizeGroups: ["YouTube"] }));
    expect(code).toContain("resizePresets: [");
    expect(code).toContain('label: "YouTube",');
    expect(code).toContain('{ label: "Thumbnail (16:9)", width: 1280, height: 720 },');
    // Unselected groups are not emitted.
    expect(code).not.toContain('label: "Instagram",');
  });

  it("serializes the crop boolean toggles when they differ from defaults", () => {
    const code = generatePlaygroundCode(
      base({ cropAllowCustomRatio: false, cropShowRotateFlip: false }),
    );
    expect(code).toContain("allowCustomRatio: false,");
    expect(code).toContain("showRotateFlip: false,");
  });

  it("never emits the deprecated modes/defaultMode fields", () => {
    const code = generatePlaygroundCode(
      base({ cropAspectPresets: ["1:1"], cropAllowCustomRatio: false }),
    );
    expect(code).not.toContain("modes:");
    expect(code).not.toContain("defaultMode:");
  });

  it("does not emit a ui.contextualBar field", () => {
    const code = generatePlaygroundCode(base({ showTitle: false }));
    expect(code).not.toContain("contextualBar");
  });
});
