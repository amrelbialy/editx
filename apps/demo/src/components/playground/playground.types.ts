export type ExportFormat = "png" | "jpeg" | "webp";
export type FontStyle = "normal" | "italic";
export type TextAlign = "left" | "center" | "right";
export type FillMode = "filled" | "outlined";

/**
 * Flat, grouped-prefix config for the playground sidebar. Mirrors the full
 * `ImageEditorConfig` surface; `build-editor-config.ts` maps it back to the
 * nested shape the editor consumes.
 */
export interface PlaygroundConfig {
  // Theme
  themePreset: string;
  borderRadius: string;
  fontFamily: string;
  colors: string[];

  // Tools
  tools: string[];
  defaultTool: string;

  // UI
  title: string;
  showTitle: boolean;
  unsavedChangesWarning: boolean;
  showCloseButton: boolean;
  showBackButton: boolean;
  compactSidebar: boolean;
  groupSeparators: boolean;

  // Crop
  cropAspectPresets: string[];
  cropResizeGroups: string[];
  cropAllowCustomRatio: boolean;
  cropShowRotateFlip: boolean;

  // Adjust
  adjustControls: string[];

  // Filter
  filterPresets: string[];

  // Text
  textDefaultFontSize: number;
  textDefaultColor: string;
  textDefaultFontStyle: FontStyle;
  textDefaultTextAlign: TextAlign;
  textDefaultLineHeight: number;
  textDefaultLetterSpacing: number;
  textMinFontSize: number;
  textMaxFontSize: number;

  // Shapes
  shapesPresets: string[];
  shapesDefaultFillMode: FillMode;
  shapesDefaultColor: string;
  shapesDefaultStrokeColor: string;
  shapesDefaultStrokeWidth: number;
  shapesDefaultOpacity: number;
  shapesDefaultCornerRadius: number;
  shapesDefaultSize: number;

  // Image
  imageMaxFileSize: number; // bytes
  imageMaxDimension: number;

  // Export
  exportFormats: ExportFormat[];
  exportFormat: ExportFormat;
  exportQuality: number;
  exportCloseAfterSave: boolean;
  exportFilename: string;

  // Locale
  locale: string;
}

export type ConfigUpdater = <K extends keyof PlaygroundConfig>(
  key: K,
  value: PlaygroundConfig[K],
) => void;

export interface SectionProps {
  config: PlaygroundConfig;
  onConfigChange: ConfigUpdater;
}
