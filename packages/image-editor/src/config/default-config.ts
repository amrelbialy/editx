import type {
  AspectRatioPreset,
  ImageEditorConfig,
  ResizePresetGroup,
  TextStylePreset,
} from "./config.types";
import { TOOL_IDS } from "./config.types";

/** Font families offered in every font picker when config omits `text.fonts`. */
export const DEFAULT_FONT_FAMILIES = [
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
];

/** Swatch palette shown in every colour picker when config omits `colors`. */
export const DEFAULT_COLOR_SWATCHES = [
  "#FFFFFF",
  "#000000",
  "#3B82F6",
  "#6366F1",
  "#10B981",
  "#059669",
  "#EF4444",
  "#DC2626",
  "#F59E0B",
  "#D97706",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
  "#06B6D4",
  "#F97316",
  "#84CC16",
];

const defaultTextPresets: TextStylePreset[] = [
  { id: "title", label: "Title", text: "Title", fontSizeScale: 3.75, fontWeight: "bold" },
  { id: "heading", label: "Heading", text: "Heading", fontSizeScale: 2.625, fontWeight: "bold" },
  {
    id: "subheading",
    label: "Subheading",
    text: "Subheading",
    fontSizeScale: 1.75,
    fontWeight: "bold",
  },
  { id: "body", label: "Body Text", text: "Body text", fontSizeScale: 1, fontWeight: "normal" },
];

const defaultAspectRatios: AspectRatioPreset[] = [
  { id: "free", label: "Free", ratio: "free" },
  { id: "original", label: "Original", ratio: "original" },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

const defaultResizePresets: ResizePresetGroup[] = [
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

export const defaultConfig: Required<
  Pick<ImageEditorConfig, "tools" | "defaultTool" | "theme" | "ui" | "export">
> &
  ImageEditorConfig = {
  tools: [...TOOL_IDS],
  defaultTool: null,

  theme: {
    preset: "dark",
    borderRadius: "0.5rem",
    fontFamily: "Inter, system-ui, sans-serif",
  },

  colors: DEFAULT_COLOR_SWATCHES,

  ui: {
    toolSidebar: {
      compact: false,
      groupSeparators: true,
    },
    title: "Image Editor",
    showTitle: true,
  },

  crop: {
    aspectRatios: defaultAspectRatios,
    allowCustomRatio: true,
    showRotateFlip: true,
    resizePresets: defaultResizePresets,
  },

  adjust: {
    controls: [
      "brightness",
      "contrast",
      "saturation",
      "temperature",
      "sharpness",
      "exposure",
      "shadows",
      "highlights",
      "blacks",
      "whites",
      "gamma",
      "clarity",
    ],
  },

  filter: {},

  text: {
    fonts: ["Inter", "Roboto", "Playfair Display", "Fira Code"],
    defaultFontSize: 24,
    defaultColor: "#ffffff",
    defaultFontWeight: "normal",
    defaultFontStyle: "normal",
    defaultTextAlign: "left",
    defaultLineHeight: 1.2,
    defaultLetterSpacing: 0,
    minFontSize: 1,
    maxFontSize: 500,
    presets: defaultTextPresets,
  },

  shapes: {
    presets: ["rect", "ellipse", "triangle", "pentagon", "hexagon", "star", "line"],
    defaultFillMode: "filled",
    defaultColor: "#3b82f6",
    defaultStrokeWidth: 0,
    defaultOpacity: 1,
    defaultCornerRadius: 0,
    defaultSize: 0.25,
  },

  image: {
    maxFileSize: 5 * 1024 * 1024,
    maxDimension: 2048,
  },

  export: {
    formats: ["png", "jpeg", "webp"],
    defaultFormat: "png",
    quality: 0.92,
  },
};
