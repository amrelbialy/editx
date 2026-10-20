import type { EditxEngine } from "@editx/engine";
import { useEffect, useState } from "react";
import type { ScreenRect } from "./use-block-screen-rect";

export interface PageScreenFrame extends ScreenRect {
  id: number;
  scale: number;
}

export function usePageScreenFrames(
  engine: EditxEngine,
  pages: readonly { id: number }[],
): PageScreenFrame[] {
  const [frames, setFrames] = useState<PageScreenFrame[]>([]);

  useEffect(() => {
    const update = () => {
      const zoom = engine.editor.getZoom();
      setFrames(
        pages.flatMap(({ id }) => {
          const bounds = engine.editor.getPageViewBounds(id);
          if (!bounds || !engine.block.isVisible(id)) return [];
          const origin = engine.editor.worldToScreen(bounds);
          if (!origin) return [];
          return [
            {
              id,
              ...origin,
              width: bounds.width * zoom,
              height: bounds.height * zoom,
              scale: Math.min(1, zoom),
            },
          ];
        }),
      );
    };
    update();
    const unsubscribe = [engine.onPanChanged(update), engine.onZoomChanged(update)];
    return () => {
      for (const stop of unsubscribe) stop();
    };
  }, [engine, pages]);

  return frames;
}
