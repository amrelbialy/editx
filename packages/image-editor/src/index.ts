export type { ButtonProps } from "./components/ui/button";
export { Button } from "./components/ui/button";
export { ColorPalette } from "./components/ui/color-palette";
export { ColorPicker, DEFAULT_COLORS } from "./components/ui/color-picker";
export { InputGroup } from "./components/ui/input-group";
export { Section } from "./components/ui/section";
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
export { SelectionGrid } from "./components/ui/selection-grid";
export { Separator } from "./components/ui/separator";
export { SliderField } from "./components/ui/slider-field";
export { SwitchField } from "./components/ui/switch-field";
export type {
  AdjustToolConfig,
  CropToolConfig,
  CustomTool,
  EditorEventCallbacks,
  EditorSlots,
  ExportConfig,
  FilterToolConfig,
  ImageEditorConfig,
  ImageEditorToolId,
  ShapesToolConfig,
  TextToolConfig,
  ThemeColorKey,
  ThemeConfig,
  ThemePreset,
  UIConfig,
} from "./config/config.types";
export { useConfig } from "./config/config-context";
// Phase 5+6: hooks, i18n, mobile components
export type { ShortcutActions } from "./hooks/use-shortcuts";
export { useShortcuts } from "./hooks/use-shortcuts";
export { I18nProvider, useTranslation } from "./i18n/i18n-context";
export { en as defaultTranslations } from "./i18n/translations/en";
export type { ImageEditorProps, ImageSource } from "./image-editor";
export { ImageEditor } from "./image-editor";
export type {
  ImageEditorTool,
  OriginalImageInfo,
  ShownImageDimensions,
} from "./store/image-editor-store";
export { useImageEditorStore } from "./store/image-editor-store";
export type { BuiltInPreset, ThemePresetValues } from "./theme/presets";
export { themePresets } from "./theme/presets";
export { ThemeProvider } from "./theme/theme-provider";
export { correctOrientation } from "./utils/correct-orientation";
export type { DownscaleResult } from "./utils/downscale-image";
export { downscaleIfNeeded } from "./utils/downscale-image";
export { extractFilename } from "./utils/extract-filename";
export { isSameSource } from "./utils/is-same-source";
export type { ImageValidationOptions, ValidationResult } from "./utils/validate-image";
export { validateImageDimensions, validateImageFile } from "./utils/validate-image";
