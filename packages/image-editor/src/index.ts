export { ImageEditor } from './image-editor';
export type { ImageEditorProps, ImageSource } from './image-editor';
export type {
  ImageEditorConfig,
  ImageEditorToolId,
  ThemeConfig,
  ThemePreset,
  ThemeColorKey,
  CropToolConfig,
  AdjustToolConfig,
  FilterToolConfig,
  TextToolConfig,
  ShapesToolConfig,
  ExportConfig,
  UIConfig,
  CustomTool,
  EditorSlots,
  EditorEventCallbacks,
} from './config/config.types';
export { themePresets } from './theme/presets';
export type { ThemePresetValues, BuiltInPreset } from './theme/presets';
export { ThemeProvider } from './theme/theme-provider';
export { useConfig } from './config/config-context';
export { useImageEditorStore } from './store/image-editor-store';
export type { ImageEditorTool, OriginalImageInfo, ShownImageDimensions } from './store/image-editor-store';
export { validateImageFile, validateImageDimensions } from './utils/validate-image';
export type { ImageValidationOptions, ValidationResult } from './utils/validate-image';
export { correctOrientation } from './utils/correct-orientation';
export { downscaleIfNeeded } from './utils/downscale-image';
export type { DownscaleResult } from './utils/downscale-image';
export { isSameSource } from './utils/is-same-source';
export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from './components/ui/select';
export { extractFilename } from './utils/extract-filename';
export { Button } from './components/ui/button';
export type { ButtonProps } from './components/ui/button';
export { Separator } from './components/ui/separator';

// Phase 5+6: hooks, i18n, mobile components
export { useResponsive } from './hooks/use-responsive';
export type { ResponsiveState } from './hooks/use-responsive';
export { useShortcuts } from './hooks/use-shortcuts';
export type { ShortcutActions } from './hooks/use-shortcuts';
export { useTranslation, I18nProvider } from './i18n/i18n-context';
export { en as defaultTranslations } from './i18n/translations/en';
