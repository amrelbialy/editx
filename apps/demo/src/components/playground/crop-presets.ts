import type { ResizePresetGroup } from "@editx/image-editor";

/**
 * Built-in aspect-ratio preset ids (mirrors the engine `defaultConfig` crop
 * `aspectRatios`). Used as the checklist of ratios exposed via `crop.presets`.
 */
export const CROP_ASPECT_PRESET_IDS = [
  "free",
  "original",
  "1:1",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
] as const;

/**
 * Built-in resize groups (mirrors the engine `defaultConfig.crop.resizePresets`).
 * The playground filters this list by label to build `crop.resizePresets`.
 */
export const BUILT_IN_RESIZE_GROUPS: ResizePresetGroup[] = [
  {
    label: "Instagram",
    presets: [
      { label: "Landscape Post (1.91:1)", width: 1080, height: 566 },
      { label: "Portrait Post (4:5)", width: 1080, height: 1350 },
      { label: "Square Post (1:1)", width: 1080, height: 1080 },
      { label: "Story / Reel (9:16)", width: 1080, height: 1920 },
      { label: "Profile Photo", width: 320, height: 320 },
    ],
  },
  {
    label: "Facebook",
    presets: [
      { label: "Cover Photo", width: 820, height: 312 },
      { label: "Profile Photo", width: 170, height: 170 },
      { label: "Shared Image (1.91:1)", width: 1200, height: 630 },
      { label: "Post (1:1)", width: 1080, height: 1080 },
      { label: "Story (9:16)", width: 1080, height: 1920 },
      { label: "Event Cover", width: 1920, height: 1080 },
    ],
  },
  {
    label: "TikTok",
    presets: [
      { label: "Profile Photo", width: 200, height: 200 },
      { label: "Video (9:16)", width: 1080, height: 1920 },
    ],
  },
  {
    label: "YouTube",
    presets: [
      { label: "Thumbnail (16:9)", width: 1280, height: 720 },
      { label: "Channel Art", width: 2560, height: 1440 },
    ],
  },
  {
    label: "General",
    presets: [
      { label: "HD (16:9)", width: 1280, height: 720 },
      { label: "Full HD (16:9)", width: 1920, height: 1080 },
      { label: "Square", width: 1080, height: 1080 },
      { label: "4K UHD", width: 3840, height: 2160 },
    ],
  },
];

export const CROP_RESIZE_GROUP_LABELS = BUILT_IN_RESIZE_GROUPS.map((g) => g.label);
