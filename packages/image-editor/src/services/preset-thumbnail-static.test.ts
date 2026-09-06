import { describe, expect, it } from "vitest";
import type { TextPreset } from "../config/config.types";
import { defaultConfig } from "../config/default-config";
import { DEFAULT_TEXT_PRESET_GROUPS } from "../config/presets";
import { getStaticPresetThumbnail } from "./preset-thumbnail-static";

const titlePreset = DEFAULT_TEXT_PRESET_GROUPS.flatMap((group) => group.presets).find(
  (preset) => preset.id === "title",
);

if (!titlePreset) throw new Error("Built-in title preset is missing");

describe("static preset thumbnails", () => {
  it("resolves an unchanged canonical built-in", () => {
    expect(getStaticPresetThumbnail(titlePreset, defaultConfig)).toMatch(
      /text-title-v1-[a-f0-9]{8}\.png$/,
    );
  });

  it("misses when a preset with the same id changes visually", () => {
    const modified: TextPreset = {
      ...titlePreset,
      blocks: titlePreset.blocks.map((block, index) =>
        index === 0 ? { ...block, text: "Modified title" } : block,
      ),
    };

    expect(getStaticPresetThumbnail(modified, defaultConfig)).toBeNull();
  });

  it("misses when effective rendering config changes", () => {
    const modifiedConfig = {
      ...defaultConfig,
      text: { ...defaultConfig.text, defaultFontSize: 32 },
    };

    expect(getStaticPresetThumbnail(titlePreset, modifiedConfig)).toBeNull();
  });

  it("keeps a single-line built-in static when only default line height changes", () => {
    const modifiedConfig = {
      ...defaultConfig,
      text: { ...defaultConfig.text, defaultLineHeight: 1.5 },
    };

    expect(getStaticPresetThumbnail(titlePreset, modifiedConfig)).toMatch(
      /text-title-v1-[a-f0-9]{8}\.png$/,
    );
  });

  it("does not treat a custom id as a canonical built-in", () => {
    expect(
      getStaticPresetThumbnail({ ...titlePreset, id: "custom-title" }, defaultConfig),
    ).toBeNull();
  });
});
