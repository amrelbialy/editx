import type React from "react";
import { useId } from "react";
import type { ShapePreset } from "../../../config/config.types";

interface ShapePresetThumbnailProps {
  preset: Pick<ShapePreset, "shape" | "fill" | "stroke">;
}

const REFERENCE_SIZE = 270;

export const ShapePresetThumbnail: React.FC<ShapePresetThumbnailProps> = (props) => {
  const { preset } = props;
  const id = useId().replace(/:/g, "");
  const geometry = createGeometry(preset.shape);
  const clipId = `${id}-clip`;
  const paintId = `${id}-paint`;
  const stroke =
    preset.stroke ??
    (preset.shape.kind === "line"
      ? { color: preset.fill.color ?? "#4a8fe3", width: 10 }
      : undefined);
  const strokeWidth = stroke
    ? stroke.width * (Math.min(geometry.width, geometry.height) / REFERENCE_SIZE)
    : undefined;

  return (
    <svg
      className="h-11 w-11 overflow-visible"
      viewBox={geometry.viewBox}
      preserveAspectRatio="xMidYMid meet"
      data-composition-shape={preset.shape.kind}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>{geometry.render({ fill: "#000000" })}</clipPath>
        {renderPaintDefinition(preset.fill, paintId, geometry)}
      </defs>
      {renderFill(preset.fill, paintId, clipId, geometry)}
      {stroke &&
        geometry.render({
          fill: "none",
          stroke: stroke.color,
          strokeWidth,
          strokeLinejoin: "round",
        })}
    </svg>
  );
};

interface ShapePaint {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeLinejoin?: "round";
}

interface ThumbnailGeometry {
  viewBox: string;
  width: number;
  height: number;
  render: (paint: ShapePaint) => React.ReactNode;
}

function renderPaintDefinition(fill: ShapePreset["fill"], id: string, geometry: ThumbnailGeometry) {
  if (fill.kind === "gradient" && fill.gradient) {
    const { type, stops, angle = 0 } = fill.gradient;
    if (type === "radial") {
      return (
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          {stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
      );
    }
    const radians = (angle * Math.PI) / 180;
    const dx = Math.cos(radians);
    const dy = Math.sin(radians);
    const length = (Math.abs(dx) + Math.abs(dy)) / 2;
    return (
      <linearGradient
        id={id}
        x1={0.5 - dx * length}
        y1={0.5 - dy * length}
        x2={0.5 + dx * length}
        y2={0.5 + dy * length}
      >
        {stops.map((stop) => (
          <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
        ))}
      </linearGradient>
    );
  }
  if (fill.kind === "image" && fill.image?.fit === "tile") {
    return (
      <pattern
        id={id}
        patternUnits="userSpaceOnUse"
        width={geometry.width / 3}
        height={geometry.height / 3}
      >
        <image href={fill.image.src} width="100%" height="100%" />
      </pattern>
    );
  }
  return null;
}

function renderFill(
  fill: ShapePreset["fill"],
  paintId: string,
  clipId: string,
  geometry: ThumbnailGeometry,
) {
  if (fill.kind === "image" && fill.image && fill.image.fit !== "tile") {
    const preserveAspectRatio =
      fill.image.fit === "stretch"
        ? "none"
        : fill.image.fit === "contain"
          ? "xMidYMid meet"
          : "xMidYMid slice";
    return (
      <image
        href={fill.image.src}
        width={geometry.width}
        height={geometry.height}
        preserveAspectRatio={preserveAspectRatio}
        clipPath={`url(#${clipId})`}
        data-shape-image
      />
    );
  }
  const color =
    fill.kind === "color"
      ? fill.color === "transparent" || fill.color === "#00000000"
        ? "none"
        : (fill.color ?? "none")
      : `url(#${paintId})`;
  return geometry.render({ fill: color });
}

function createGeometry(shape: ShapePreset["shape"]): ThumbnailGeometry {
  if (shape.kind === "path" && shape.pathData) {
    const viewBox = shape.viewBox ?? { width: 100, height: 100 };
    return {
      viewBox: `0 0 ${viewBox.width} ${viewBox.height}`,
      ...viewBox,
      render: (paint) => <path d={shape.pathData} {...paint} />,
    };
  }
  if (shape.kind === "rect") {
    return referenceGeometry((paint) => (
      <rect
        width={REFERENCE_SIZE}
        height={REFERENCE_SIZE}
        rx={shape.cornerRadius ?? 0}
        {...paint}
      />
    ));
  }
  if (shape.kind === "ellipse") {
    return referenceGeometry((paint) => (
      <ellipse
        cx={REFERENCE_SIZE / 2}
        cy={REFERENCE_SIZE / 2}
        rx={REFERENCE_SIZE / 2}
        ry={REFERENCE_SIZE / 2}
        {...paint}
      />
    ));
  }
  if (shape.kind === "line") {
    const pointerLength = shape.pointerLength ?? 15;
    const pointerWidth = shape.pointerWidth ?? 15;
    const end = REFERENCE_SIZE;
    const base = end - pointerLength;
    const center = REFERENCE_SIZE / 2;
    const pointer = `${base},${center + pointerWidth / 2} ${end},${center} ${base},${center - pointerWidth / 2}`;
    return referenceGeometry((paint) => (
      <>
        <line x1="0" y1={center} x2={end} y2={center} {...paint} />
        <polygon points={pointer} {...paint} />
      </>
    ));
  }
  const count =
    shape.kind === "star" ? Math.max(2, shape.points ?? 5) * 2 : Math.max(3, shape.sides ?? 5);
  const inner = shape.kind === "star" ? Math.max(0, Math.min(1, shape.innerDiameter ?? 0.5)) : 1;
  const points = radialPoints(count, (index) => (index % 2 ? inner : 1));
  return referenceGeometry((paint) => <polygon points={points} {...paint} />);
}

function referenceGeometry(render: ThumbnailGeometry["render"]): ThumbnailGeometry {
  return {
    viewBox: `0 0 ${REFERENCE_SIZE} ${REFERENCE_SIZE}`,
    width: REFERENCE_SIZE,
    height: REFERENCE_SIZE,
    render,
  };
}

function radialPoints(count: number, radiusAt: (index: number) => number): string {
  const center = REFERENCE_SIZE / 2;
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const radius = center * radiusAt(index);
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  }).join(" ");
}
