import type { EditxEngine } from "@editx/engine";
import { useCallback } from "react";
import type { ImageEditorConfig } from "../config/config.types";
import { DEFAULT_TEXT_PRESET_GROUPS } from "../config/presets";
import { findPresetById, resolveTextPresetGroups } from "../config/resolve-presets";
import { useImageEditorStore } from "../store/image-editor-store";
import { insertTextPreset } from "./insert-text-preset";

/** Id of a text style preset (matches a preset `id` in the resolved gallery). */
export type TextPreset = string;

const REFERENCE_DIM = 1080;

/** Centered, auto-sized layout for a style block that carries no geometry. */
function centeredTextLayout(pageW: number, pageH: number, fontSize: number, scaleFactor: number) {
  const width = Math.min(pageW * 0.35, 400 * scaleFactor);
  const height = fontSize * 1.5;
  const x = (pageW - width) / 2;
  const y = (pageH - height) / 2;
  return { x, y, width, height };
}

export interface UseTextToolOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  config: ImageEditorConfig;
}

export function useTextTool({ engineRef, config }: UseTextToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  const handleAddText = useCallback(
    (preset?: TextPreset) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;

      const text = config.text ?? {};
      const presets = text.presets ?? [];
      const presetConfig =
        presets.find((p) => p.id === preset) ?? presets.find((p) => p.id === "body") ?? presets[0];

      const fontSizeScale = presetConfig?.fontSizeScale ?? 1;
      const baseFontSize = text.defaultFontSize ?? 24;
      const fontFamily = text.defaultFontFamily ?? text.fonts?.[0] ?? "Arial";
      const fill = text.defaultColor ?? "#ffffff";
      const fontWeight = presetConfig?.fontWeight ?? text.defaultFontWeight ?? "normal";
      const fontStyle = text.defaultFontStyle ?? "normal";
      const letterSpacing = text.defaultLetterSpacing ?? 0;
      const content = presetConfig?.text ?? "Text";

      const { width: pageW, height: pageH } = ce.block.getPageDimensions(editableBlockId);
      const scaleFactor = Math.min(pageW, pageH) / REFERENCE_DIM;
      const fontSize = Math.round(baseFontSize * fontSizeScale * scaleFactor);

      const { x, y, width, height } = centeredTextLayout(pageW, pageH, fontSize, scaleFactor);

      ce.beginBatch();
      const textId = ce.block.addText(editableBlockId, x, y, width, height, content, {
        style: {
          fontSize,
          fontWeight,
          fontStyle,
          fontFamily,
          fill,
          letterSpacing,
        },
      });

      if (text.defaultTextAlign) ce.block.setTextAlign(textId, text.defaultTextAlign);
      if (text.defaultLineHeight !== undefined)
        ce.block.setTextLineHeight(textId, text.defaultLineHeight);
      // Hug the content so default text isn't inserted overly wide.
      ce.block.setTextAutoWidth(textId, true);
      ce.endBatch();

      ce.block.select(textId);
    },
    [engineRef, editableBlockId, config.text],
  );

  const handleAddTextPreset = useCallback(
    (id: string) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;

      const text = config.text ?? {};
      const groups = resolveTextPresetGroups({
        builtIn: DEFAULT_TEXT_PRESET_GROUPS,
        presetGroups: text.presetGroups,
        additionalPresetGroups: text.additionalPresetGroups,
        legacyPresets: text.presets,
      });
      const preset = findPresetById(groups, id);
      // Back-compat: unknown ids fall through to the legacy single-block flow.
      if (!preset) {
        handleAddText(id);
        return;
      }

      const { width: pageW, height: pageH } = ce.block.getPageDimensions(editableBlockId);
      const scaleFactor = Math.min(pageW, pageH) / REFERENCE_DIM;
      const selectId = insertTextPreset(
        { engine: ce, pageId: editableBlockId, pageW, pageH, scaleFactor, config: text },
        preset,
      );

      if (selectId !== undefined) ce.block.select(selectId);
    },
    [engineRef, editableBlockId, config.text, handleAddText],
  );

  return { handleAddText, handleAddTextPreset };
}
