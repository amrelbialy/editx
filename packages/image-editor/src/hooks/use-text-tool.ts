import type { EditxEngine, TextRunStyle } from "@editx/engine";
import { useCallback } from "react";
import type { ImageEditorConfig } from "../config/config.types";
import { DEFAULT_TEXT_PRESET_GROUPS } from "../config/presets";
import { findPresetById, resolveTextPresetGroups } from "../config/resolve-presets";
import { useImageEditorStore } from "../store/image-editor-store";
import { applyTextBackgroundBox } from "../utils/apply-text-background-box";

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
      const baseFontSize = text.defaultFontSize ?? 24;
      const dFamily = text.defaultFontFamily ?? text.fonts?.[0] ?? "Arial";
      const dWeight = text.defaultFontWeight ?? "normal";
      const dStyle = text.defaultFontStyle ?? "normal";
      const dFill = text.defaultColor ?? "#ffffff";

      ce.beginBatch();
      const ids = preset.blocks.map((block) => {
        const fontSize = Math.round(baseFontSize * (block.fontSizeScale ?? 1) * scaleFactor);
        const style: Partial<TextRunStyle> = {
          fontSize,
          fontFamily: block.fontFamily ?? dFamily,
          fontWeight: block.fontWeight ?? dWeight,
          fontStyle: block.fontStyle ?? dStyle,
          fill: block.fill ?? dFill,
        };
        if (block.letterSpacing !== undefined)
          style.letterSpacing = block.letterSpacing * scaleFactor;
        if (block.textTransform) style.textTransform = block.textTransform;
        if (block.textStrokeColor) style.textStrokeColor = block.textStrokeColor;
        if (block.textStrokeWidth !== undefined)
          style.textStrokeWidth = block.textStrokeWidth * scaleFactor;
        if (block.textShadowColor) style.textShadowColor = block.textShadowColor;
        if (block.textShadowBlur !== undefined)
          style.textShadowBlur = block.textShadowBlur * scaleFactor;
        if (block.textShadowOffsetX !== undefined)
          style.textShadowOffsetX = block.textShadowOffsetX * scaleFactor;
        if (block.textShadowOffsetY !== undefined)
          style.textShadowOffsetY = block.textShadowOffsetY * scaleFactor;
        if (block.backgroundColor) style.backgroundColor = block.backgroundColor;

        const layout =
          block.x !== undefined
            ? {
                x: block.x * pageW,
                y: block.y * pageH,
                width: block.width * pageW,
                height: block.height * pageH,
              }
            : centeredTextLayout(pageW, pageH, fontSize, scaleFactor);

        const textId = ce.block.addText(
          editableBlockId,
          layout.x,
          layout.y,
          layout.width,
          layout.height,
          block.text,
          { style },
        );

        const align = block.align ?? text.defaultTextAlign;
        if (align) ce.block.setTextAlign(textId, align);
        const lineHeight = block.lineHeight ?? text.defaultLineHeight;
        if (lineHeight !== undefined) ce.block.setTextLineHeight(textId, lineHeight);
        // Curve and gradient don't combine: curve wins, gradient is skipped.
        if (block.curve && block.curve.radius > 0) {
          ce.block.setTextCurve(textId, block.curve.radius * scaleFactor, block.curve.direction);
        } else if (block.fillGradient) {
          ce.block.setTextGradient(textId, 0, block.text.length, block.fillGradient);
        }
        // Data is applied even when curved; the engine suppresses the paint.
        if (block.backgroundBox)
          applyTextBackgroundBox(ce, textId, block.backgroundBox, scaleFactor);
        // Single-block presets (style or plain) hug their content; multi-block
        // compositions keep authored width for arrangement, and curved blocks
        // own their own sizing.
        const isCurved = (block.curve?.radius ?? 0) > 0;
        if (preset.blocks.length === 1 && !isCurved) ce.block.setTextAutoWidth(textId, true);
        return textId;
      });

      const shouldGroup = ids.length > 1 && (preset.group ?? true);
      const selectId = shouldGroup ? ce.block.group(ids) : ids[0];
      ce.endBatch();

      if (selectId !== undefined) ce.block.select(selectId);
    },
    [engineRef, editableBlockId, config.text, handleAddText],
  );

  return { handleAddText, handleAddTextPreset };
}
