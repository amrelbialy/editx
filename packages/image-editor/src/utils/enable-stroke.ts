import { type EditxEngine, hexToColor } from "@editx/engine";

export interface EnableStrokeDefaults {
  /** Configured stroke color (hex). Applied only when the block has no visible stroke color yet. */
  color?: string;
  /** Configured stroke width in canvas px. Values <= 0 fall back to a canvas-relative width. */
  width?: number;
}

/**
 * Enable stroke on a block, applying visible defaults when the block has no
 * meaningful stroke yet. A freshly created shape has stroke width 0 and a
 * fully transparent stroke color, so simply flipping the enabled flag would
 * leave an invisible outline. This fills in the configured stroke color/width
 * (falling back to an opaque color and a canvas-relative width) so the stroke
 * is immediately visible.
 */
export function enableStrokeWithDefaults(
  engine: EditxEngine,
  blockId: number,
  defaults?: EnableStrokeDefaults,
): void {
  engine.block.setStrokeEnabled(blockId, true);

  if (engine.block.getStrokeWidth(blockId) <= 0) {
    const configuredWidth = defaults?.width;
    if (configuredWidth != null && configuredWidth > 0) {
      engine.block.setStrokeWidth(blockId, configuredWidth);
    } else {
      const pageId = engine.block.getParent(blockId) ?? blockId;
      const { width, height } = engine.block.getPageDimensions(pageId);
      engine.block.setStrokeWidth(
        blockId,
        Math.max(2, Math.round(Math.min(width, height) * 0.005)),
      );
    }
  }

  const color = engine.block.getStrokeColor(blockId);
  if (color.a === 0) {
    engine.block.setStrokeColor(
      blockId,
      defaults?.color ? hexToColor(defaults.color) : { r: 0, g: 0, b: 0, a: 1 },
    );
  }
}
