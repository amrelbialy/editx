import type { PresetGroup, ShapePreset } from "../../config/config.types";
import { LEGACY_FILLED_ARROW_PRESET, SHARED_SHAPE_GEOMETRIES } from "../../config/presets";
import { toShapeGeometry } from "../../config/shape-geometry-options";

type PreviewPaint = Pick<ShapePreset, "fill" | "stroke">;

function geometryIdentity(shape: ShapePreset["shape"]): string {
  const geometry = toShapeGeometry(shape);
  if (geometry.type !== "path") return JSON.stringify(geometry);
  return JSON.stringify({
    type: geometry.type,
    pathData: geometry.pathData,
    viewBox: geometry.viewBox,
  });
}

function basicPreset(
  id: string,
  label: string,
  shape: ShapePreset["shape"],
  paint: PreviewPaint,
): ShapePreset {
  return {
    id: `replacement-${id}`,
    label,
    shape,
    ...paint,
    preview: { kind: "shape" },
  };
}

export function createShapeReplacementGroups(
  configured: PresetGroup<ShapePreset>[],
  paint: PreviewPaint,
): PresetGroup<ShapePreset>[] {
  const basic = SHARED_SHAPE_GEOMETRIES.map((geometry) =>
    basicPreset(geometry.id, geometry.label, geometry.shape, paint),
  );
  basic.push(
    basicPreset("arrow", LEGACY_FILLED_ARROW_PRESET.label, LEGACY_FILLED_ARROW_PRESET.shape, paint),
  );

  const seen = new Set(basic.map((preset) => geometryIdentity(preset.shape)));
  const abstract: ShapePreset[] = [];
  for (const preset of configured.flatMap((group) => group.presets)) {
    let identity: string;
    try {
      identity = geometryIdentity(preset.shape);
    } catch {
      continue;
    }
    if (seen.has(identity)) continue;
    seen.add(identity);
    abstract.push({ ...preset, ...paint });
  }

  return [
    { id: "primitive", label: "Basic", presets: basic },
    ...(abstract.length ? [{ id: "path", label: "Abstract", presets: abstract }] : []),
  ];
}
