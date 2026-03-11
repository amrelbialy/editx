import { useCallback } from 'react';
import { SHAPE_POLYGON_SIDES, type CreativeEngine, type ShapeType } from '@creative-editor/engine';
import { useImageEditorStore } from '../store/image-editor-store';

export interface UseShapesToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useShapesTool({ engineRef }: UseShapesToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  const handleAddShape = useCallback((shapeType: ShapeType, sides?: number) => {
    const ce = engineRef.current;
    if (!ce || editableBlockId === null) return;

    const pageW = ce.block.getFloat(editableBlockId, 'page/width') ?? 1080;
    const pageH = ce.block.getFloat(editableBlockId, 'page/height') ?? 1080;
    const size = Math.min(pageW, pageH) * 0.25;

    const shapeW = shapeType === 'line' ? pageW * 0.5 : size;
    const shapeH = shapeType === 'line' ? size : size;
    const x = (pageW - shapeW) / 2;
    const y = (pageH - shapeH) / 2;

    const graphicId = ce.block.addShape(editableBlockId, shapeType, 'color', x, y, shapeW, shapeH);

    if (sides && shapeType === 'polygon') {
      const shapeId = ce.block.getShape(graphicId);
      if (shapeId != null) {
        ce.block.setFloat(shapeId, SHAPE_POLYGON_SIDES, sides);
      }
    }

    ce.block.select(graphicId);
  }, [engineRef, editableBlockId]);

  return { handleAddShape };
}
