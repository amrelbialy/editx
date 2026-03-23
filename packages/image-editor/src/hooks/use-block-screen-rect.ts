import { useEffect, useState, useRef } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Tracks the screen-pixel bounding rect of the currently selected block.
 * Polls via requestAnimationFrame so it stays updated during drag, zoom, and pan.
 */
export function useBlockScreenRect(
  engine: CreativeEngine | null,
  selectedBlockId: number | null,
): ScreenRect | null {
  const [rect, setRect] = useState<ScreenRect | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!engine || selectedBlockId === null) {
      setRect(null);
      return;
    }

    function tick() {
      // Try transformer rect first; fall back to direct block rect
      const r = engine!.editor.getSelectedBlockScreenRect()
        ?? engine!.editor.getBlockScreenRect(selectedBlockId!);
      setRect((prev) => {
        if (!r) return prev ? null : prev;
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
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [engine, selectedBlockId]);

  return rect;
}
