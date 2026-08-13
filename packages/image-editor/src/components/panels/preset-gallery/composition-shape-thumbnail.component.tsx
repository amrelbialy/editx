import type React from "react";
import { useId } from "react";
import type { TextCompositionPreview } from "../../../config/text-composition.types";

type ShapeLayer = Extract<TextCompositionPreview["layers"][number], { kind: "shape" }>;

interface CompositionShapeThumbnailProps {
  layer: ShapeLayer;
}

const INSERTED_LINE_STROKE = { color: "#4a8fe3", width: 10 } as const;
const INSERTED_LINE_POINTER_LENGTH = 15;
const INSERTED_LINE_POINTER_WIDTH = 15;

export const CompositionShapeThumbnail: React.FC<CompositionShapeThumbnailProps> = (props) => {
  const { layer } = props;
  const clipId = useId().replaceAll(":", "");

  if (["line", "star", "polygon", "path"].includes(layer.shape.kind)) {
    const geometry = toSvgGeometry(layer);
    const stroke = parseBorder(layer.style?.border);
    const solidFill = parseSolidFill(layer.style?.background);
    return (
      <svg
        className="h-full w-full overflow-visible"
        viewBox={geometry.viewBox}
        preserveAspectRatio={layer.shape.kind === "path" ? "xMinYMin meet" : "none"}
        data-composition-shape={layer.shape.kind}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {geometry.clip}
          </clipPath>
        </defs>
        {solidFill ? (
          geometry.fill(solidFill)
        ) : (
          <foreignObject width="100%" height="100%" clipPath={`url(#${clipId})`}>
            <div className="h-full w-full" style={toFillStyle(layer.style, false)} />
          </foreignObject>
        )}
        {geometry.stroke(stroke)}
      </svg>
    );
  }

  return (
    <div
      className="h-full w-full"
      style={{ ...toFillStyle(layer.style), ...toGeometryStyle(layer) }}
      data-composition-shape={layer.shape.kind}
    />
  );
};

function toFillStyle(style: ShapeLayer["style"], includeBorder = true): React.CSSProperties {
  return {
    background: style?.background,
    ...(style?.backgroundImage
      ? {
          backgroundImage: style.backgroundImage,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }
      : {}),
    border: includeBorder ? style?.border : undefined,
  };
}

function toGeometryStyle(layer: ShapeLayer): React.CSSProperties {
  const { shape, style } = layer;
  if (shape.kind === "ellipse") return { borderRadius: "50%" };
  if (shape.kind === "rect") {
    return { borderRadius: style?.borderRadius };
  }
  return { borderRadius: style?.borderRadius, clipPath: style?.clipPath };
}

function radialPoints(count: number, radiusAt: (index: number) => number): string {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const radius = radiusAt(index);
    return `${format(50 + Math.cos(angle) * radius)},${format(50 + Math.sin(angle) * radius)}`;
  }).join(" ");
}

function format(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function parseBorder(border?: string): { width: number; color: string } | undefined {
  const match = border?.match(/^([\d.]+)px solid (.+)$/);
  return match ? { width: Number(match[1]), color: match[2] } : undefined;
}

function parseSolidFill(background?: string): string | undefined {
  return background && !background.includes("(") ? background : undefined;
}

type Stroke = ReturnType<typeof parseBorder>;

function toSvgGeometry(layer: ShapeLayer) {
  const strokeProps = (stroke: Stroke) =>
    stroke
      ? { fill: "none", stroke: stroke.color, strokeWidth: stroke.width, strokeLinejoin: "round" }
      : { fill: "none" };
  if (layer.shape.kind === "path" && layer.shape.pathData) {
    const viewBox = layer.shape.viewBox ?? { width: 100, height: 100 };
    const pathData = layer.shape.pathData;
    return {
      viewBox: `0 0 ${viewBox.width} ${viewBox.height}`,
      clip: <path d={pathData} />,
      fill: (fill: string) => <path d={pathData} fill={fill} />,
      stroke: (stroke: Stroke) => <path d={pathData} {...strokeProps(stroke)} />,
    };
  }
  if (layer.shape.kind === "line") {
    const pointerBaseX = 100 - INSERTED_LINE_POINTER_LENGTH;
    const pointerHalfWidth = INSERTED_LINE_POINTER_WIDTH / 2;
    const pointer = `${pointerBaseX},${50 + pointerHalfWidth} 100,50 ${pointerBaseX},${50 - pointerHalfWidth}`;
    const effectiveStroke = parseBorder(layer.style?.border) ?? INSERTED_LINE_STROKE;
    const lineStrokeProps = {
      fill: "none",
      stroke: effectiveStroke.color,
      strokeWidth: effectiveStroke.width,
    };
    return {
      viewBox: "0 0 100 100",
      clip: <polygon points={pointer} />,
      fill: (fill: string) => <polygon points={pointer} fill={fill} />,
      stroke: () => (
        <>
          <line x1="0" y1="50" x2="100" y2="50" {...lineStrokeProps} />
          <polygon points={pointer} {...lineStrokeProps} />
        </>
      ),
    };
  }
  const count =
    layer.shape.kind === "star"
      ? Math.max(2, layer.shape.points ?? 5) * 2
      : Math.max(3, layer.shape.sides ?? 5);
  const innerRadius =
    layer.shape.kind === "star"
      ? Math.max(0, Math.min(1, layer.shape.innerDiameter ?? 0.5)) * 50
      : 50;
  const points = radialPoints(count, (index) => (index % 2 ? innerRadius : 50));
  return {
    viewBox: "0 0 100 100",
    clip: <polygon points={points} />,
    fill: (fill: string) => <polygon points={points} fill={fill} />,
    stroke: (stroke: Stroke) => <polygon points={points} {...strokeProps(stroke)} />,
  };
}
