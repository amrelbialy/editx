import type React from "react";

export type AspectRatioIconVariant = "free" | "original" | "ratio";

export interface AspectRatioIconProps {
  /** Aspect ratio (width / height) — used when variant is "ratio". */
  ratio?: number;
  variant?: AspectRatioIconVariant;
  className?: string;
}

const BOX = 18;
const VIEW = 24;

/** Geometry for a ratio-accurate rectangle centered in the 24×24 viewBox. */
function rectFor(ratio: number) {
  let w: number;
  let h: number;
  if (ratio >= 1) {
    w = BOX;
    h = BOX / ratio;
  } else {
    h = BOX;
    w = BOX * ratio;
  }
  const x0 = (VIEW - w) / 2;
  const y0 = (VIEW - h) / 2;
  return { x0, y0, x1: x0 + w, y1: y0 + h, w, h };
}

/** Four corner brackets framing the given rectangle. */
function cornerBrackets(ratio: number) {
  const { x0, y0, x1, y1, w, h } = rectFor(ratio);
  const L = Math.min(5, w / 2.5, h / 2.5);
  return [
    `M ${x0} ${y0 + L} V ${y0} H ${x0 + L}`,
    `M ${x1 - L} ${y0} H ${x1} V ${y0 + L}`,
    `M ${x1} ${y1 - L} V ${y1} H ${x1 - L}`,
    `M ${x0 + L} ${y1} H ${x0} V ${y1 - L}`,
  ].join(" ");
}

/**
 * Aspect-ratio icon whose shape reflects the actual proportions, in the
 * corner-bracket style used by img.ly. Inherits color via `currentColor`.
 */
export const AspectRatioIcon: React.FC<AspectRatioIconProps> = (props) => {
  const { ratio = 1, variant = "ratio", className } = props;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {variant === "free" && (
        <rect x={4} y={4} width={16} height={16} rx={2} strokeDasharray="3 3" />
      )}

      {variant === "original" && (
        <>
          <path d={cornerBrackets(1)} />
          <path d="M 9.5 13 V 9.5 H 13" />
          <path d="M 14.5 11 V 14.5 H 11" />
          <path d="M 9.5 9.5 L 14.5 14.5" />
        </>
      )}

      {variant === "ratio" && <path d={cornerBrackets(ratio)} />}
    </svg>
  );
};
