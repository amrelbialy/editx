import type { EditxEngine, TextBackgroundPadding } from "@editx/engine";
import { hexToColor } from "@editx/engine";
import type { TextBackgroundBoxSpec, TextBoxPadding } from "../config/config.types";

const SIDES = ["top", "right", "bottom", "left"] as const;

/** Authored padding (all-sides number or per-side object) scaled to canvas px. */
function scalePadding(
  padding: TextBoxPadding | undefined,
  scaleFactor: number,
): number | Partial<TextBackgroundPadding> | undefined {
  if (padding === undefined) return undefined;
  if (typeof padding === "number") return padding * scaleFactor;
  const scaled: Partial<TextBackgroundPadding> = {};
  for (const side of SIDES) {
    const value = padding[side];
    if (value !== undefined) scaled[side] = value * scaleFactor;
  }
  return scaled;
}

/**
 * Apply an authored {@link TextBackgroundBoxSpec} to an inserted text block.
 * Preset lengths are resolution-independent (authored against the 1080
 * reference edge), so every length is multiplied by the canvas scale factor.
 * Box shadow and stroke reuse the block shadow/stroke APIs and stay inert
 * while the box is disabled. Call inside the caller's batch.
 */
export function applyTextBackgroundBox(
  engine: EditxEngine,
  blockId: number,
  box: TextBackgroundBoxSpec,
  scaleFactor: number,
): void {
  engine.block.setTextBackground(blockId, {
    enabled: true,
    geometry: "frame",
    color: hexToColor(box.color),
    cornerRadius: (box.cornerRadius ?? 0) * scaleFactor,
    padding: scalePadding(box.padding, scaleFactor),
  });

  if (box.shadow) {
    engine.block.setShadowEnabled(blockId, true);
    engine.block.setShadowColor(blockId, hexToColor(box.shadow.color));
    engine.block.setShadowOffsetX(blockId, (box.shadow.offsetX ?? 0) * scaleFactor);
    engine.block.setShadowOffsetY(blockId, (box.shadow.offsetY ?? 0) * scaleFactor);
    engine.block.setShadowBlur(blockId, (box.shadow.blur ?? 0) * scaleFactor);
  }

  if (box.stroke) {
    engine.block.setStrokeEnabled(blockId, true);
    engine.block.setStrokeColor(blockId, hexToColor(box.stroke.color));
    engine.block.setStrokeWidth(blockId, box.stroke.width * scaleFactor);
  }
}
