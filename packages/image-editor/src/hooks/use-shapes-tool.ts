import type { CreativeEngine, ShapeType } from "@creative-editor/engine";
import { hexToColor } from "@creative-editor/engine";
import { useCallback } from "react";
import { useConfig } from "../config/config-context";
import { useImageEditorStore } from "../store/image-editor-store";

export interface UseShapesToolOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
}

export function useShapesTool({ engineRef }: UseShapesToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);
  const config = useConfig();

  const handleAddShape = useCallback(
    (shapeType: ShapeType, sides?: number) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;

      const fillMode = config.shapes?.defaultFillMode ?? "filled";
      const defaultColor = config.shapes?.defaultColor ?? "#3b82f6";

      const { width: pageW, height: pageH } = ce.block.getPageDimensions(editableBlockId);
      const size = Math.min(pageW, pageH) * 0.25;

      const shapeW = shapeType === "line" ? pageW * 0.5 : size;
      const shapeH = shapeType === "line" ? size : size;
      const x = (pageW - shapeW) / 2;
      const y = (pageH - shapeH) / 2;

      const graphicId = ce.block.addShape(
        editableBlockId,
        shapeType,
        "color",
        x,
        y,
        shapeW,
        shapeH,
        { sides },
      );

      ce.block.setFillSolidColor(graphicId, hexToColor(defaultColor));
      if (fillMode === "outlined") {
        ce.block.setFillEnabled(graphicId, false);
        ce.block.setStrokeEnabled(graphicId, true);
        ce.block.setStrokeColor(graphicId, hexToColor(defaultColor));
      }

      ce.block.select(graphicId);
    },
    [engineRef, editableBlockId, config.shapes],
  );

  return { handleAddShape };
}
