import type React from "react";
import type { BuiltInPreset, ThemeColorKey } from "../theme/presets";
import type { PresetGroup, ShapePreset, TextPreset, TextStylePreset } from "./preset.types";

export type { ThemeColorKey } from "../theme/presets";
export type {
  PresetGroup,
  PresetPreview,
  PreviewBoxStyle,
  PreviewStyle,
  PreviewTextSegment,
  ShapePreset,
  TextBackgroundBoxSpec,
  TextBoxPadding,
  TextLayoutSpec,
  TextPreset,
  TextPresetBlock,
  TextPresetRunStyle,
  TextPresetRunStyleUpdate,
  TextRunOverride,
  TextStylePreset,
  TextStyleSpec,
} from "./preset.types";

export type CloseReason = "save" | "close-button" | "back-button" | "escape";

export const TOOL_IDS = ["crop", "adjust", "filter", "text", "shapes", "image"] as const;
export type ImageEditorToolId = (typeof TOOL_IDS)[number];

export type ThemePreset = BuiltInPreset | "custom";

export interface ThemeConfig {
  preset?: ThemePreset;
  colors?: Partial<Record<ThemeColorKey, string>>;
  borderRadius?: string;
  fontFamily?: string;
}

export interface UIConfig {
  toolSidebar?: {
    /**
     * Compact the tool rail to a tight, icon-only column: hides the text
     * labels, narrows the rail, and shrinks each button to a square. Tool names
     * move to the tooltip + `aria-label`. Defaults to `false` (roomy, labelled).
     */
    compact?: boolean;
    groupSeparators?: boolean;
  };
  title?: string;
  showTitle?: boolean;
  /** Show close button (X) in topbar. Default: true when onClose is provided. */
  showCloseButton?: boolean;
  /** Show back arrow instead of X for close. Default: false. */
  showBackButton?: boolean;
  /** Show a confirmation dialog when closing with unsaved changes. Default: true. */
  unsavedChangesWarning?: boolean;
}

export interface CropToolConfig {
  /**
   * Aspect-ratio presets for the Aspect Ratio tab. Provide a full custom list
   * of `{ id, label, ratio }` objects — mirrors how `resizePresets` works.
   * When omitted, the built-in ratios are used.
   */
  aspectRatios?: AspectRatioPreset[];
  /**
   * Whitelist of aspect-ratio preset ids to show (in the given order). Applied
   * on top of `aspectRatios`. When omitted, every preset in `aspectRatios`
   * renders. Prefer defining `aspectRatios` directly for custom lists.
   */
  presets?: string[];
  /**
   * @deprecated Reserved / not implemented. The crop tool has no mode switcher;
   * this field is retained only for type compatibility and is ignored.
   */
  modes?: ("crop" | "cover" | "fit")[];
  /**
   * @deprecated Reserved / not implemented. The crop tool has no mode switcher;
   * this field is retained only for type compatibility and is ignored.
   */
  defaultMode?: "crop" | "cover" | "fit";
  allowCustomRatio?: boolean;
  showRotateFlip?: boolean;
  /** Size presets for the Resize tab (grouped by platform). */
  resizePresets?: ResizePresetGroup[];
}

/**
 * A selectable aspect ratio in the Crop tool's Aspect Ratio tab.
 */
export interface AspectRatioPreset {
  /** Stable id used to track the active selection (also the button test id). */
  id: string;
  /** Display label shown under the icon. */
  label: string;
  /**
   * Aspect ratio as `width / height`. Special string values:
   * - `"free"` — unconstrained crop (also the default when omitted).
   * - `"original"` — the source image's own ratio.
   */
  ratio?: number | "free" | "original";
}

export interface ResizePreset {
  label: string;
  width: number;
  height: number;
}

export interface ResizePresetGroup {
  label: string;
  presets: ResizePreset[];
}

export interface AdjustToolConfig {
  controls?: string[];
}

export interface FilterToolConfig {
  /**
   * Whitelist of filter preset names to show (in addition to the always-present
   * "Original"). When omitted, every built-in preset is shown.
   */
  presets?: string[];
}

export interface TextToolConfig {
  /** Font families listed in every font picker. */
  fonts?: string[];
  /** Family applied to new text (falls back to `fonts[0]`). */
  defaultFontFamily?: string;
  /**
   * Reference font size (px) at a 1080px canvas. The size applied to new text is
   * scaled to the actual canvas and preset:
   * `round(defaultFontSize × presetScale × min(pageW, pageH) / 1080)`.
   */
  defaultFontSize?: number;
  /** Fill colour applied to new text. */
  defaultColor?: string;
  /** Font weight applied to new text (a preset's own weight wins). */
  defaultFontWeight?: "normal" | "bold";
  /** Font style applied to new text. */
  defaultFontStyle?: "normal" | "italic";
  /** Horizontal alignment applied to new text. */
  defaultTextAlign?: "left" | "center" | "right";
  /** Line height applied to new text. */
  defaultLineHeight?: number;
  /** Letter spacing (px) applied to new text. */
  defaultLetterSpacing?: number;
  /** Lower bound (px) for the font-size input. Default `1`. */
  minFontSize?: number;
  /** Upper bound (px) for the font-size input. Default `500`. */
  maxFontSize?: number;
  /** @deprecated Legacy flat list. Mapped to one gallery category. Prefer `presetGroups`. */
  presets?: TextStylePreset[];
  /** Categorized text presets. **Replaces** the built-in catalog when set. */
  presetGroups?: PresetGroup<TextPreset>[];
  /** Extra categories **appended** to built-ins (matching `id` merges presets). */
  additionalPresetGroups?: PresetGroup<TextPreset>[];
}

export interface ShapesToolConfig {
  /** @deprecated Legacy shape-kind allowlist. Mapped to one gallery category. Prefer `presetGroups`. */
  presets?: string[];
  /** Categorized shape presets. **Replaces** the built-in catalog when set. */
  presetGroups?: PresetGroup<ShapePreset>[];
  /** Extra categories **appended** to built-ins (matching `id` merges presets). */
  additionalPresetGroups?: PresetGroup<ShapePreset>[];
  defaultFillMode?: "filled" | "outlined";
  defaultColor?: string;
  /** Stroke color for outlined shapes. Falls back to `defaultColor` when unset. */
  defaultStrokeColor?: string;
  /** Stroke width for outlined shapes, in the same units as the editor stroke Width control (0–20). `0` (default) derives a canvas-relative width. */
  defaultStrokeWidth?: number;
  /** Starting opacity for new shapes, 0–1 (default `1`). */
  defaultOpacity?: number;
  /** Corner radius (canvas px) applied to new rectangles (default `0`). */
  defaultCornerRadius?: number;
  /** Starting size as a fraction of the smaller canvas edge, 0–1 (default `0.25`). */
  defaultSize?: number;
}

export interface ImageToolConfig {
  /** Maximum file size in bytes (default: 5MB). */
  maxFileSize?: number;
  /** Maximum dimension in px — larger images are downscaled (default: 2048). */
  maxDimension?: number;
}

export interface ExportConfig {
  formats?: ("png" | "jpeg" | "webp")[];
  defaultFormat?: "png" | "jpeg" | "webp";
  quality?: number;
  /** Automatically close the editor after a successful save. Default: false. */
  closeAfterSave?: boolean;
  /**
   * Base filename (without extension) for the default download that runs when
   * no `onSave` handler is provided. Defaults to a name derived from the source
   * image, falling back to `"edited"`.
   */
  filename?: string;
}

// ── Custom tool registration ──

export interface CustomTool {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: "editing" | "annotation";
  /** Panel content rendered when this tool is selected. */
  panel?: React.ComponentType;
  /** Content rendered in the contextual bar when this tool is active. */
  contextualBar?: React.ComponentType;
}

// ── Slot system ──

export interface EditorSlots {
  /** Rendered on the right side of the topbar (before export). */
  topbarRight?: React.ReactNode;
  /** Rendered at the bottom of the tool sidebar (above Apps). */
  sidebarBottom?: React.ReactNode;
  /** Extra content in the contextual bar. */
  contextualBarExtra?: React.ReactNode;
}

// ── Event callbacks ──

export interface EditorEventCallbacks {
  /** Called when the active tool changes. */
  onToolChange?: (toolId: string | null) => void;
  /** Called before save — return a transformed blob, or undefined to use original. */
  onBeforeSave?: (blob: Blob) => Promise<Blob | undefined> | Blob | undefined;
}

export interface ImageEditorConfig {
  tools?: ImageEditorToolId[];
  defaultTool?: ImageEditorToolId | null;
  theme?: ThemeConfig;
  /**
   * Swatch palette (hex strings) shown in every colour picker — text fill,
   * shape fill, and background colour. Users can still pick any custom colour.
   */
  colors?: string[];
  crop?: CropToolConfig;
  adjust?: AdjustToolConfig;
  filter?: FilterToolConfig;
  text?: TextToolConfig;
  shapes?: ShapesToolConfig;
  image?: ImageToolConfig;
  ui?: UIConfig;
  locale?: string;
  translations?: Record<string, string>;
  /** When provided, called instead of the built-in dictionary lookup. */
  translateFn?: (key: string) => string;
  export?: ExportConfig;
  customTools?: CustomTool[];
}
