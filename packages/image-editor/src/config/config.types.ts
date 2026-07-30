import type React from "react";
import type { BuiltInPreset } from "../theme/presets";

export type { ThemeColorKey } from "../theme/presets";

import type { ThemeColorKey } from "../theme/presets";

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
  contextualBar?: {
    show?: boolean;
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
  presets?: string[];
  modes?: ("crop" | "cover" | "fit")[];
  defaultMode?: "crop" | "cover" | "fit";
  allowCustomRatio?: boolean;
  showStraighten?: boolean;
  showRotateFlip?: boolean;
  /** Size presets for the Resize tab (grouped by platform). */
  resizePresets?: ResizePresetGroup[];
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
  showIntensity?: boolean;
  /**
   * Whitelist of filter preset names to show (in addition to the always-present
   * "Original"). When omitted, every built-in preset is shown.
   */
  presets?: string[];
}

export interface TextToolConfig {
  fonts?: string[];
  defaultFontFamily?: string;
  defaultFontSize?: number;
  defaultColor?: string;
}

export interface ShapesToolConfig {
  presets?: string[];
  defaultFillMode?: "filled" | "outlined";
  defaultColor?: string;
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
