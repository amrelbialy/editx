import { colorToHex, type EditxEngine } from "@editx/engine";
import type React from "react";
import { useCallback, useMemo } from "react";
import type { PresetGroup, ShapePreset } from "../../config/config.types";
import { useConfig } from "../../config/config-context";
import { DEFAULT_SHAPE_PRESET_GROUPS } from "../../config/presets";
import { resolveShapePresetGroups } from "../../config/resolve-presets";
import { toShapeGeometry } from "../../config/shape-geometry-options";
import { useHistoryVersion } from "../../hooks/use-history-version";
import { PresetGallery } from "./preset-gallery";

interface ShapeReplacePanelProps {
  engine: EditxEngine;
  blockId: number;
}

const preview = { kind: "shape" as const };
const neutralFill = { kind: "color" as const, color: "#64748b" };

function readPreviewPaint(
  engine: EditxEngine,
  blockId: number,
): Pick<ShapePreset, "fill" | "stroke"> {
  const fillId = engine.block.getFill(blockId);
  const fillKind = fillId == null ? "color" : engine.block.getKind(fillId);
  let fill: ShapePreset["fill"] = neutralFill;
  if (!engine.block.isFillEnabled(blockId)) {
    fill = { kind: "color", color: "transparent" };
  } else if (fillKind === "gradient") {
    const gradient = engine.block.getFillGradient(blockId);
    if (gradient) fill = { kind: "gradient", gradient };
  } else if (fillKind === "image") {
    const image = engine.block.getFillImage(blockId);
    if (image) fill = { kind: "image", image };
  } else {
    const color = engine.block.getFillSolidColor(blockId);
    if (color) fill = { kind: "color", color: colorToHex(color) };
  }

  const stroke = engine.block.isStrokeEnabled(blockId)
    ? {
        color: colorToHex(engine.block.getStrokeColor(blockId)),
        width: engine.block.getStrokeWidth(blockId),
      }
    : undefined;
  return { fill, stroke };
}

const primitivePresets: ShapePreset[] = [
  { id: "primitive-rect", label: "Rectangle", shape: { kind: "rect" }, fill: neutralFill, preview },
  {
    id: "primitive-ellipse",
    label: "Ellipse",
    shape: { kind: "ellipse" },
    fill: neutralFill,
    preview,
  },
  { id: "primitive-arrow", label: "Arrow", shape: { kind: "line" }, fill: neutralFill, preview },
  {
    id: "primitive-polygon",
    label: "Polygon",
    shape: { kind: "polygon", sides: 5 },
    fill: neutralFill,
    preview,
  },
  { id: "primitive-star", label: "Star", shape: { kind: "star" }, fill: neutralFill, preview },
];

export const ShapeReplacePanel: React.FC<ShapeReplacePanelProps> = (props) => {
  const { engine, blockId } = props;
  const config = useConfig();
  useHistoryVersion(engine);

  const previewPaint = readPreviewPaint(engine, blockId);

  const groups = useMemo<PresetGroup<ShapePreset>[]>(() => {
    const configured = resolveShapePresetGroups({
      builtIn: DEFAULT_SHAPE_PRESET_GROUPS,
      presetGroups: config.shapes?.presetGroups,
      additionalPresetGroups: config.shapes?.additionalPresetGroups,
      legacyPresets: config.shapes?.presets,
      defaultColor: config.shapes?.defaultColor,
    });
    const paths = configured
      .flatMap((group) => group.presets)
      .filter((preset) => preset.shape.kind === "path")
      .map((preset) => ({ ...preset, ...previewPaint }));
    return [
      {
        id: "primitive",
        label: "Basic",
        presets: primitivePresets.map((preset) => ({ ...preset, ...previewPaint })),
      },
      ...(paths.length ? [{ id: "path", label: "Abstract", presets: paths }] : []),
    ];
  }, [config.shapes, previewPaint]);

  const replaceShape = useCallback(
    (id: string) => {
      const preset = groups.flatMap((group) => group.presets).find((item) => item.id === id);
      if (!preset) return;
      engine.block.setShapeGeometry(blockId, toShapeGeometry(preset.shape, preset.id));
    },
    [engine, blockId, groups],
  );

  return <PresetGallery groups={groups} onSelect={replaceShape} />;
};
