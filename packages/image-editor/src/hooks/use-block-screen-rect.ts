import type { EditxEngine } from "@editx/engine";
import { useEffect, useState } from "react";

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tracks the screen-pixel bounding rect of the currently selected block.
 *
 * Event-driven: recomputes only when something that can move the rect happens —
 * pan, zoom, a live on-canvas transform (drag/resize), or a committed geometry
 * change (including undo/redo). No polling.
 */
export function useBlockScreenRect(
  engine: EditxEngine | null,
  selectedBlockId: number | null,
): ScreenRect | null {
  const [rect, setRect] = useState<ScreenRect | null>(null);

  useEffect(() => {
    if (!engine || selectedBlockId === null) {
      setRect(null);
      return;
    }

    const update = () => {
      // Try transformer rect first; fall back to direct block rect.
      const r =
        engine.editor.getSelectedBlockScreenRect() ??
        engine.editor.getBlockScreenRect(selectedBlockId);
      setRect((prev) => {
        if (!r) return null;
        if (
          prev &&
          prev.x === r.x &&
          prev.y === r.y &&
          prev.width === r.width &&
          prev.height === r.height
        ) {
          return prev;
        }
        return r;
      });
    };

    // Compute immediately so the overlay is positioned before the first event.
    update();

    const unsubscribers = [
      engine.onPanChanged(update),
      engine.onZoomChanged(update),
      engine.onBlockTransform((event) => {
        if (event.block === selectedBlockId) update();
      }),
      engine.event.subscribe([selectedBlockId], update),
    ];

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [engine, selectedBlockId]);

  return rect;
}
