import type Konva from "konva";
import { EDGE_HIT_WIDTH, layerInvScale } from "./konva-transformer-scale";

/**
 * Detect when the cursor is near a transformer border edge and:
 * - Show a move cursor.
 * - Highlight the corresponding center pill anchor.
 *
 * This uses a mousemove listener on the stage (not on the back shape)
 * to avoid stealing mouse events from the resize anchors. The underlying
 * block is already draggable, so clicking near the border naturally
 * allows moving the block.
 */
export function setupEdgeHover(
  transformer: Konva.Transformer,
  uiLayer: Konva.Layer,
  setHovered: (id: string, hovered: boolean) => void,
) {
  const stage = uiLayer.getStage();
  if (!stage) return;

  let lastPill = "";
  let wasOnEdge = false;

  stage.on("mousemove.transformerEdge", () => {
    // Only active when the transformer has nodes
    if (transformer.nodes().length === 0) {
      if (wasOnEdge) clearEdgeState();
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const back = transformer.findOne(".back") as Konva.Shape | undefined;
    if (!back) return;

    // Convert screen position to back-local coordinates
    const absTransform = back.getAbsoluteTransform().copy().invert();
    const local = absTransform.point(pointer);
    const w = back.width();
    const h = back.height();

    // Check if cursor is within EDGE_HIT_WIDTH of a border edge
    const distTop = Math.abs(local.y);
    const distBottom = Math.abs(local.y - h);
    const distLeft = Math.abs(local.x);
    const distRight = Math.abs(local.x - w);

    const threshold = EDGE_HIT_WIDTH * layerInvScale(back);
    const inBoundsX = local.x >= -threshold && local.x <= w + threshold;
    const inBoundsY = local.y >= -threshold && local.y <= h + threshold;

    let nearestPill = "";

    if (inBoundsX && distTop < threshold && inBoundsY) nearestPill = "top-center";
    else if (inBoundsX && distBottom < threshold && inBoundsY) nearestPill = "bottom-center";
    else if (inBoundsY && distLeft < threshold && inBoundsX) nearestPill = "middle-left";
    else if (inBoundsY && distRight < threshold && inBoundsX) nearestPill = "middle-right";

    if (nearestPill) {
      wasOnEdge = true;

      if (nearestPill !== lastPill) {
        if (lastPill) setHovered(lastPill, false);
        setHovered(nearestPill, true);
        lastPill = nearestPill;
        uiLayer.batchDraw();
      }
    } else if (wasOnEdge) {
      clearEdgeState();
    }
  });

  function clearEdgeState() {
    if (lastPill) {
      setHovered(lastPill, false);
      lastPill = "";
    }
    wasOnEdge = false;
    // Don't reset cursor here — let Konva's anchor mouseout handle it
    // Only reset if no anchor is being hovered
    if (stage.content && !(transformer as any)._cursorChange) {
      stage.content.style.cursor = "";
    }
    uiLayer.batchDraw();
  }
}
