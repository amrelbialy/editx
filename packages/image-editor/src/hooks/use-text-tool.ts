import type { CreativeEngine } from "@creative-editor/engine";
import { useCallback } from "react";
import { useConfig } from "../config/config-context";
import { useImageEditorStore } from "../store/image-editor-store";

export type TextPreset = "title" | "heading" | "subheading" | "body";

const PRESET_CONFIG: Record<
  TextPreset,
  { fontSizeScale: number; fontWeight: string; text: string }
> = {
  title: { fontSizeScale: 3.75, fontWeight: "bold", text: "Title" },
  heading: { fontSizeScale: 2.625, fontWeight: "bold", text: "Heading" },
  subheading: { fontSizeScale: 1.75, fontWeight: "bold", text: "Subheading" },
  body: { fontSizeScale: 1, fontWeight: "normal", text: "Body text" },
};

export interface UseTextToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useTextTool({ engineRef }: UseTextToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const config = useConfig();

  const handleAddText = useCallback(
    (preset: TextPreset = "body") => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;

      const presetConfig = PRESET_CONFIG[preset];
      const baseFontSize = config.text?.defaultFontSize ?? 24;
      const fontSize = Math.round(baseFontSize * presetConfig.fontSizeScale);
      const fontFamily = config.text?.defaultFontFamily ?? config.text?.fonts?.[0] ?? "Arial";
      const fill = config.text?.defaultColor ?? "#ffffff";

      const { width: pageW, height: pageH } = ce.block.getPageDimensions(editableBlockId);

      const width = Math.min(pageW * 0.35, 400);
      const height = fontSize * 1.5;
      const x = (pageW - width) / 2;
      const y = (pageH - height) / 2;

      const textId = ce.block.addText(editableBlockId, x, y, width, height, presetConfig.text, {
        style: {
          fontSize,
          fontWeight: presetConfig.fontWeight,
          fontFamily,
          fill,
        },
      });

      ce.block.select(textId);
    },
    [engineRef, editableBlockId, config.text],
  );

  return { handleAddText };
}
