import type Konva from "konva";

const DEFAULT_ACCENT = "#2563eb";
const HOVER_STROKE = "#ffffff";

// Draw the circle background + Lucide refresh-cw icon in one pass.
// Uses Path2D with the raw SVG path data for pixel-perfect rendering.
const REFRESH_CW_PATHS = [
  "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
  "M21 3v5h-5",
  "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
  "M8 16H3v5",
];

// Pre-build Path2D objects once (supported in all modern browsers)
let cachedPaths: Path2D[] | null = null;
function getRefreshPaths(): Path2D[] {
  if (!cachedPaths) {
    cachedPaths = REFRESH_CW_PATHS.map((d) => new Path2D(d));
  }
  return cachedPaths;
}

export function rotaterSceneFunc(ctx: Konva.Context, shape: Konva.Rect) {
  const w = shape.width();
  const h = shape.height();

  // Circle background
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStrokeShape(shape);

  // Lucide refresh-cw icon (24×24 viewBox). Size is derived from the anchor's
  // own (already zoom-compensated) width so the icon stays screen-constant.
  const native = ctx._context;
  native.save();

  const iconSize = (w * 14) / 24;
  const scale = iconSize / 24;
  native.translate((w - iconSize) / 2, (h - iconSize) / 2);
  native.scale(scale, scale);

  // Use contrasting color: when hovered, fill is accent so draw icon in white
  const hovered = shape.getAttr("_hovered");
  const accent = shape.getAttr("_accent") || DEFAULT_ACCENT;
  native.strokeStyle = hovered ? HOVER_STROKE : accent;
  native.lineWidth = 2;
  native.lineCap = "round";
  native.lineJoin = "round";

  for (const p of getRefreshPaths()) {
    native.stroke(p);
  }

  native.restore();
}
