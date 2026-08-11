import type { TextCurveDirection, TextRun } from "../block/block.types";
import {
  applyTextTransform,
  formatFont,
  getDummyContext,
  type ResolvedTextRunStyle,
  resolveStyle,
} from "./formatted-text-utils";

/** A single glyph placed along the arc, with its local transform. */
export interface CurvedGlyph {
  char: string;
  /** Local x of the glyph anchor (padding-inclusive, non-negative). */
  x: number;
  /** Local y of the glyph anchor (padding-inclusive, non-negative). */
  y: number;
  /** Rotation in radians applied about the anchor. */
  rotation: number;
  style: ResolvedTextRunStyle;
  width: number;
}

/** Distinct return type for the curved layout so the renderer branches cleanly. */
export interface CurvedTextLayout {
  glyphs: CurvedGlyph[];
  /** Arc bounding box in node-local coords (top-left origin). */
  bbox: { x: number; y: number; width: number; height: number };
}

export interface CurvedLayoutConfig {
  radius: number;
  direction: TextCurveDirection;
  padding: number;
}

interface RawGlyph {
  char: string;
  style: ResolvedTextRunStyle;
  width: number;
}

/** Per-character advance measurement (letter-spacing folded into the advance). */
function measureGlyphs(runs: TextRun[]): RawGlyph[] {
  const ctx = getDummyContext();
  const glyphs: RawGlyph[] = [];
  for (const run of runs) {
    const style = resolveStyle(run.style);
    ctx.font = formatFont(style);
    for (const raw of run.text) {
      if (raw === "\n") continue; // word-wrap disabled; newlines don't break the arc
      const disp = applyTextTransform(raw, style.textTransform);
      const width = ctx.measureText(disp).width + style.letterSpacing;
      glyphs.push({ char: disp, style, width });
    }
  }
  return glyphs;
}

/**
 * Lay out text along a circular arc. Only invoked when radius > 0.
 *
 * Each glyph is placed at arc-length `s` from the apex (θ = s / R). Positions
 * are emitted around a local apex at (0, 0), then shifted so the arc bounding
 * box is top-left aligned at (padding, padding). Direction flips the vertical
 * bow AND the rotation sign, so "up" and "down" mirror one another.
 */
export function computeCurvedLayout(runs: TextRun[], config: CurvedLayoutConfig): CurvedTextLayout {
  const glyphs = measureGlyphs(runs);
  const empty = { x: 0, y: 0, width: 0, height: 0 };
  if (glyphs.length === 0) return { glyphs: [], bbox: empty };

  const R = config.radius;
  const sign = config.direction === "down" ? -1 : 1;
  const totalWidth = glyphs.reduce((sum, g) => sum + g.width, 0);
  const half = totalWidth / 2;

  const placed: CurvedGlyph[] = [];
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxFont = 0;
  let advance = 0;

  for (const g of glyphs) {
    const s = advance + g.width / 2 - half; // arc-length from apex
    advance += g.width;
    const theta = s / R;
    const px = R * Math.sin(theta);
    const py = sign * R * (1 - Math.cos(theta));
    placed.push({
      char: g.char,
      x: px,
      y: py,
      rotation: sign * theta,
      style: g.style,
      width: g.width,
    });
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
    if (g.style.fontSize > maxFont) maxFont = g.style.fontSize;
  }

  // Glyphs are drawn centered on their anchor (textAlign/baseline = center/middle),
  // so pad the raw anchor extents by half the tallest glyph on every side.
  const halfFont = maxFont / 2;
  const boxMinX = minX - halfFont;
  const boxMinY = minY - halfFont;
  const width = maxX + halfFont - boxMinX;
  const height = maxY + halfFont - boxMinY;

  const offX = -boxMinX + config.padding;
  const offY = -boxMinY + config.padding;
  for (const g of placed) {
    g.x += offX;
    g.y += offY;
  }

  return {
    glyphs: placed,
    bbox: { x: 0, y: 0, width: width + config.padding * 2, height: height + config.padding * 2 },
  };
}
