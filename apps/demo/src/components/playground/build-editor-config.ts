import type { ImageEditorConfig, ThemeColorKey, ThemeConfig } from "@editx/image-editor";
import { demoPresets } from "../../theme/presets";
import { BUILT_IN_RESIZE_GROUPS } from "./crop-presets";
import { LOCALE_TRANSLATIONS } from "./locale-translations";
import { SHAPE_PRESET_IDS } from "./playground.constants";
import type { PlaygroundConfig } from "./playground.types";

function buildTheme(config: PlaygroundConfig): ThemeConfig {
  const { themePreset, borderRadius, fontFamily } = config;
  const base = { borderRadius, fontFamily };

  if (themePreset === "dark" || themePreset === "light") {
    return { preset: themePreset, ...base };
  }
  const colors = demoPresets[themePreset] as Partial<Record<ThemeColorKey, string>> | undefined;
  return colors ? { preset: "custom", colors, ...base } : { preset: "dark", ...base };
}

/** Maps the flat playground config into the nested `ImageEditorConfig`. */
export function buildEditorConfig(config: PlaygroundConfig): ImageEditorConfig {
  return {
    tools: config.tools as ImageEditorConfig["tools"],
    defaultTool: config.defaultTool
      ? (config.defaultTool as NonNullable<ImageEditorConfig["defaultTool"]>)
      : null,
    theme: buildTheme(config),
    colors: config.colors,
    crop: {
      presets: config.cropAspectPresets,
      resizePresets: BUILT_IN_RESIZE_GROUPS.filter((g) =>
        config.cropResizeGroups.includes(g.label),
      ),
      allowCustomRatio: config.cropAllowCustomRatio,
      showRotateFlip: config.cropShowRotateFlip,
    },
    adjust: {
      controls: config.adjustControls,
    },
    filter: {
      presets: config.filterPresets,
    },
    text: {
      defaultFontSize: config.textDefaultFontSize,
      defaultColor: config.textDefaultColor,
      defaultFontStyle: config.textDefaultFontStyle,
      defaultTextAlign: config.textDefaultTextAlign,
      defaultLineHeight: config.textDefaultLineHeight,
      defaultLetterSpacing: config.textDefaultLetterSpacing,
      minFontSize: config.textMinFontSize,
      maxFontSize: config.textMaxFontSize,
    },
    shapes: {
      ...(config.shapesPresets.length === SHAPE_PRESET_IDS.length &&
      config.shapesPresets.every((preset, index) => preset === SHAPE_PRESET_IDS[index])
        ? {}
        : { presets: config.shapesPresets }),
      defaultFillMode: config.shapesDefaultFillMode,
      defaultColor: config.shapesDefaultColor,
      defaultStrokeColor: config.shapesDefaultStrokeColor,
      defaultStrokeWidth: config.shapesDefaultStrokeWidth,
      defaultOpacity: config.shapesDefaultOpacity,
      defaultCornerRadius: config.shapesDefaultCornerRadius,
      defaultSize: config.shapesDefaultSize,
    },
    image: {
      maxFileSize: config.imageMaxFileSize,
      maxDimension: config.imageMaxDimension,
    },
    ui: {
      title: config.title,
      showTitle: config.showTitle,
      unsavedChangesWarning: config.unsavedChangesWarning,
      showCloseButton: config.showCloseButton,
      showBackButton: config.showBackButton,
      toolSidebar: {
        compact: config.compactSidebar,
        groupSeparators: config.groupSeparators,
      },
    },
    export: {
      formats: config.exportFormats,
      defaultFormat: config.exportFormat,
      quality: config.exportQuality,
      closeAfterSave: config.exportCloseAfterSave,
      ...(config.exportFilename ? { filename: config.exportFilename } : {}),
    },
    locale: config.locale,
    ...(LOCALE_TRANSLATIONS[config.locale]
      ? { translations: LOCALE_TRANSLATIONS[config.locale] }
      : {}),
  };
}
