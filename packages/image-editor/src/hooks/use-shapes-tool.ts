import type { EditxEngine, ShapeGeometry, ShapeType } from "@editx/engine";
import { hexToColor } from "@editx/engine";
import { useCallback } from "react";
import type { ImageEditorConfig } from "../config/config.types";
import { DEFAULT_SHAPE_PRESET_GROUPS } from "../config/presets";
import { findPresetById, resolveShapePresetGroups } from "../config/resolve-presets";
import { normalizeShapePresetGeometry } from "../config/shape-geometry-options";
import { useImageEditorStore } from "../store/image-editor-store";

export interface UseShapesToolOptions {
  engineRef: React.RefObject<EditxEngine | null>;
  config: ImageEditorConfig;
}

export function useShapesTool({ engineRef, config }: UseShapesToolOptions) {
  const editableBlockId = useImageEditorStore((s) => s.editableBlockId);

  const handleAddShape = useCallback(
    (shapeType: ShapeType, sides?: number) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;

      const shapes = config.shapes;
      const fillMode = shapes?.defaultFillMode ?? "filled";
      const defaultColor = shapes?.defaultColor ?? "#3b82f6";
      const strokeColor = shapes?.defaultStrokeColor ?? defaultColor;
      const strokeWidth = shapes?.defaultStrokeWidth ?? 0;
      const opacity = shapes?.defaultOpacity ?? 1;
      const cornerRadius = shapes?.defaultCornerRadius ?? 0;
      const sizeFraction = shapes?.defaultSize ?? 0.25;

      let geometry: ShapeGeometry;
      try {
        geometry = normalizeShapePresetGeometry({
          kind: shapeType,
          sides,
          cornerRadius: shapeType === "rect" ? cornerRadius : undefined,
        });
      } catch {
        return;
      }

      const { width: pageW, height: pageH } = ce.block.getPageDimensions(editableBlockId);
      const size = Math.min(pageW, pageH) * sizeFraction;

      const shapeW = shapeType === "line" ? pageW * 0.5 : size;
      const shapeH = size;
      const x = (pageW - shapeW) / 2;
      const y = (pageH - shapeH) / 2;

      ce.beginBatch();
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

      if (opacity !== 1) {
        ce.block.setOpacity(graphicId, opacity);
      }

      ce.block.setShapeGeometry(graphicId, geometry);

      if (fillMode === "outlined") {
        ce.block.setFillEnabled(graphicId, false);
        ce.block.setStrokeEnabled(graphicId, true);
        ce.block.setStrokeColor(graphicId, hexToColor(strokeColor));
        // Stroke width defaults to 0 (invisible). Use the configured width, or
        // derive a canvas-relative one so the outline is visible at any size.
        const width =
          strokeWidth > 0 ? strokeWidth : Math.max(2, Math.round(Math.min(pageW, pageH) * 0.005));
        ce.block.setStrokeWidth(graphicId, width);
      }
      ce.endBatch();

      ce.block.select(graphicId);
    },
    [engineRef, editableBlockId, config.shapes],
  );

  const handleAddShapePreset = useCallback(
    (id: string) => {
      const ce = engineRef.current;
      if (!ce || editableBlockId === null) return;

      const shapes = config.shapes ?? {};
      const groups = resolveShapePresetGroups({
        builtIn: DEFAULT_SHAPE_PRESET_GROUPS,
        presetGroups: shapes.presetGroups,
        additionalPresetGroups: shapes.additionalPresetGroups,
        legacyPresets: shapes.presets,
        defaultColor: shapes.defaultColor,
      });
      const preset = findPresetById(groups, id);
      // Back-compat: unknown ids fall through to the legacy shape-kind flow.
      if (!preset) {
        handleAddShape(id as ShapeType);
        return;
      }

      let geometry: ShapeGeometry;
      try {
        geometry = normalizeShapePresetGeometry(preset.shape, preset.id);
      } catch {
        return;
      }

      const defaultColor = shapes.defaultColor ?? "#3b82f6";
      const opacity = shapes.defaultOpacity ?? 1;
      const sizeFraction = preset.sizeFraction ?? shapes.defaultSize ?? 0.25;

      const { width: pageW, height: pageH } = ce.block.getPageDimensions(editableBlockId);
      const size = Math.min(pageW, pageH) * sizeFraction;
      const shapeW = preset.shape.kind === "line" ? pageW * 0.5 : size;
      const shapeH = size;
      const x = (pageW - shapeW) / 2;
      const y = (pageH - shapeH) / 2;

      ce.beginBatch();
      let graphicId: number;
      try {
        try {
          graphicId = ce.block.addShape(
            editableBlockId,
            preset.shape.kind,
            preset.fill.kind,
            x,
            y,
            shapeW,
            shapeH,
            {
              sides: preset.shape.sides,
              pathData: preset.shape.pathData,
              viewBox: preset.shape.viewBox,
            },
          );
        } catch {
          return;
        }

        if (preset.fill.kind === "gradient" && preset.fill.gradient) {
          const g = preset.fill.gradient;
          ce.block.setFillGradient(graphicId, { type: g.type, stops: g.stops, angle: g.angle });
        } else if (preset.fill.kind === "image" && preset.fill.image) {
          const img = preset.fill.image;
          ce.block.setFillImage(graphicId, { src: img.src, fit: img.fit });
        } else {
          const color = hexToColor(preset.fill.color ?? defaultColor);
          ce.block.setFillSolidColor(graphicId, color);
          if (color.a === 0) ce.block.setFillEnabled(graphicId, false);
        }

        if (preset.stroke) {
          ce.block.setStrokeEnabled(graphicId, true);
          ce.block.setStrokeColor(graphicId, hexToColor(preset.stroke.color));
          ce.block.setStrokeWidth(graphicId, preset.stroke.width);
        }

        if (opacity !== 1) ce.block.setOpacity(graphicId, opacity);

        ce.block.setShapeGeometry(graphicId, geometry);
      } finally {
        ce.endBatch();
      }

      ce.block.select(graphicId);
    },
    [engineRef, editableBlockId, config.shapes, handleAddShape],
  );

  return { handleAddShape, handleAddShapePreset };
}
