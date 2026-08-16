import type { ShapeType } from "@editx/engine";
import type React from "react";
import { useMemo } from "react";
import { useConfig } from "../../config/config-context";
import { DEFAULT_SHAPE_PRESET_GROUPS } from "../../config/presets";
import { resolveShapePresetGroups } from "../../config/resolve-presets";
import { PresetGallery } from "./preset-gallery";

export interface ShapesPanelProps {
  /** Legacy shape-kind insertion (retained for API compatibility). */
  onAddShape: (shapeType: ShapeType, sides?: number) => void;
  /** Gallery insertion by preset id. */
  onAddShapePreset?: (id: string) => void;
}

/**
 * Thin wrapper: resolves the shape preset catalog (built-in rich catalog by
 * default; consumer `presetGroups` / `additionalPresetGroups` / legacy
 * `presets` honoured) and delegates browsing + insertion to the gallery.
 */
export const ShapesPanel: React.FC<ShapesPanelProps> = (props) => {
  const { onAddShape, onAddShapePreset } = props;

  const config = useConfig();

  const groups = useMemo(() => {
    const shapes = config.shapes ?? {};
    return resolveShapePresetGroups({
      builtIn: DEFAULT_SHAPE_PRESET_GROUPS,
      presetGroups: shapes.presetGroups,
      additionalPresetGroups: shapes.additionalPresetGroups,
      legacyPresets: shapes.presets,
      defaultColor: shapes.defaultColor,
    });
  }, [config.shapes]);

  const handleSelect = onAddShapePreset ?? ((id: string) => onAddShape(id as ShapeType));

  return <PresetGallery groups={groups} onSelect={handleSelect} />;
};
