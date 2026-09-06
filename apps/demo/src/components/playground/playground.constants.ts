import { FILTER_PRESETS } from "@editx/engine";
import { CROP_ASPECT_PRESET_IDS, CROP_RESIZE_GROUP_LABELS } from "./crop-presets";
import type { ExportFormat, PlaygroundConfig } from "./playground.types";

export const SAMPLE_LANDSCAPE =
  "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";
export const SAMPLE_PORTRAIT =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1600&q=90";

export const ALL_TOOLS = ["crop", "adjust", "filter", "text", "shapes", "image"] as const;

export const ADJUST_CONTROLS = [
  // Ordered to match the editor's Adjust panel (Basic group, then Refinements).
  "brightness",
  "saturation",
  "contrast",
  "gamma",
  "clarity",
  "exposure",
  "shadows",
  "highlights",
  "blacks",
  "whites",
  "temperature",
  "sharpness",
] as const;

export const EXPORT_FORMATS: ExportFormat[] = ["png", "jpeg", "webp"];

/** Export format options ({ label, value }) for the whitelist + default-format controls. */
export const EXPORT_FORMAT_OPTIONS = EXPORT_FORMATS.map((f) => ({
  label: f.toUpperCase(),
  value: f,
}));

/** All built-in filter presets ({ label, value } — value is the preset name), in engine order. */
export const FILTER_PRESET_OPTIONS = Array.from(FILTER_PRESETS, ([value, info]) => ({
  label: info.label,
  value,
}));

/** Filter preset names (map keys) in canonical engine order. */
export const FILTER_PRESET_NAMES = FILTER_PRESET_OPTIONS.map((o) => o.value);

/**
 * Built-in shape ids for `shapes.presets`, in canonical order. Labels mirror the
 * Shapes panel; the shape list is a UI-level const in the SDK (not engine-exported),
 * so it is duplicated here to match the documented ids.
 */
export const SHAPE_PRESET_OPTIONS = [
  { label: "Rectangle", value: "rect" },
  { label: "Ellipse", value: "ellipse" },
  { label: "Triangle", value: "triangle" },
  { label: "Pentagon", value: "pentagon" },
  { label: "Hexagon", value: "hexagon" },
  { label: "Star", value: "star" },
  { label: "Arrow", value: "line" },
] as const;

/** Shape preset ids in canonical order. */
export const SHAPE_PRESET_IDS = SHAPE_PRESET_OPTIONS.map((o) => o.value);

export const FONT_FAMILY_OPTIONS = [
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "System UI", value: "system-ui, sans-serif" },
  { label: "Georgia (serif)", value: "Georgia, serif" },
  { label: "Courier (mono)", value: '"Courier New", monospace' },
] as const;

export const BORDER_RADIUS_OPTIONS = [
  { label: "None", value: "0rem" },
  { label: "Small", value: "0.25rem" },
  { label: "Medium", value: "0.5rem" },
  { label: "Large", value: "0.75rem" },
  { label: "Full", value: "1rem" },
] as const;

export const LOCALE_OPTIONS = [
  { label: "English", value: "en" },
  { label: "Español", value: "es" },
  { label: "Français", value: "fr" },
  { label: "Deutsch", value: "de" },
  { label: "العربية", value: "ar" },
] as const;

/** Default swatch palette shown in every color picker (mirrors engine default). */
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

/** Matches the engine `defaultConfig` so the code output can omit unchanged fields. */
export const DEFAULT_PLAYGROUND_CONFIG: PlaygroundConfig = {
  themePreset: "dark",
  borderRadius: "0.5rem",
  fontFamily: "Inter, system-ui, sans-serif",
  colors: DEFAULT_COLOR_SWATCHES,

  tools: [...ALL_TOOLS],
  defaultTool: "",

  title: "Image Editor",
  showTitle: true,
  unsavedChangesWarning: true,
  showCloseButton: true,
  showBackButton: false,
  compactSidebar: false,
  groupSeparators: true,

  cropAspectPresets: [...CROP_ASPECT_PRESET_IDS],
  cropResizeGroups: [...CROP_RESIZE_GROUP_LABELS],
  cropAllowCustomRatio: true,
  cropShowRotateFlip: true,

  adjustControls: [...ADJUST_CONTROLS],

  filterPresets: [...FILTER_PRESET_NAMES],

  textDefaultFontSize: 24,
  textDefaultColor: "#ffffff",
  textDefaultFontStyle: "normal",
  textDefaultTextAlign: "left",
  textDefaultLineHeight: 1.1,
  textDefaultLetterSpacing: 0,
  textMinFontSize: 1,
  textMaxFontSize: 500,

  shapesPresets: [...SHAPE_PRESET_IDS],
  shapesDefaultFillMode: "filled",
  shapesDefaultColor: "#3b82f6",
  shapesDefaultStrokeColor: "#3b82f6",
  shapesDefaultStrokeWidth: 0,
  shapesDefaultOpacity: 1,
  shapesDefaultCornerRadius: 0,
  shapesDefaultSize: 0.5,

  imageMaxFileSize: 5 * 1024 * 1024,
  imageMaxDimension: 2048,

  exportFormats: ["png", "jpeg", "webp"],
  exportFormat: "png",
  exportQuality: 0.92,
  exportCloseAfterSave: false,
  exportFilename: "",

  locale: "en",
};
