import { useCallback } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import { useImageEditorStore } from '../store/image-editor-store';

export type TextPreset = 'heading' | 'subheading' | 'body';

const PRESET_CONFIG: Record<TextPreset, { fontSize: number; fontWeight: string; text: string }> = {
  heading:    { fontSize: 48, fontWeight: 'bold',   text: 'Heading' },
  subheading: { fontSize: 32, fontWeight: 'bold',   text: 'Subheading' },
  body:       { fontSize: 18, fontWeight: 'normal', text: 'Body text' },
};

export interface UseTextToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useTextTool({ engineRef }: UseTextToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  const handleAddText = useCallback((preset: TextPreset = 'body') => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    const config = PRESET_CONFIG[preset];
    const pageW = ce.block.getFloat(editableBlockId, 'page/width') ?? 1080;
    const pageH = ce.block.getFloat(editableBlockId, 'page/height') ?? 1080;

    const width = Math.min(pageW * 0.35, 400);
    const height = config.fontSize * 1.5;
    const x = (pageW - width) / 2;
    const y = (pageH - height) / 2;

    const textId = ce.block.addText(editableBlockId, x, y, width, height, config.text, {
      style: {
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        fontFamily: 'Arial',
        fill: '#000000',
      },
    });

    ce.block.select(textId);
  }, [engineRef, editableBlockId]);

  return { handleAddText };
}
