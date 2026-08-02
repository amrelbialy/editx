import type { EditxEngine } from "@editx/engine";
import { useCallback } from "react";
import type { ImageEditorConfig } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";

/** Id of a text style preset (matches `config.text.presets[].id`). */
export type TextPreset = string;

const REFERENCE_DIM = 1080;

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

      const width = Math.min(pageW * 0.35, 400 * scaleFactor);
      const height = fontSize * 1.5;
      const x = (pageW - width) / 2;
      const y = (pageH - height) / 2;

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
      ce.endBatch();

      ce.block.select(textId);
    },
    [engineRef, editableBlockId, config.text],
  );

  return { handleAddText };
}
