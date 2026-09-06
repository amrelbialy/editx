import type { EditxEngine } from "@editx/engine";
import type React from "react";
import { useImageEditorStore } from "../../store/image-editor-store";

export interface TextSelectionLayerProps {
  engine: EditxEngine;
  blockId: number;
  zoom: number;
}

/**
 * Custom caret + selection positioned from the engine layout so they hug the
 * glyphs exactly like the Konva canvas. The native caret/selection are hidden
 * (see `caret-color`/`::selection` in styles.css); this layer draws them.
 */
export const TextSelectionLayer: React.FC<TextSelectionLayerProps> = ({
  engine,
  blockId,
  zoom,
}) => {
  const range = useImageEditorStore((s) => s.textSelectionRange);
  if (!range) return null;

  const collapsed = range.from === range.to;
  const rects = collapsed ? [] : engine.block.getTextSelectionRects(blockId, range.from, range.to);
  const caret = engine.block.getTextCaretRect(blockId, range.to);

  return (
    <>
      {rects.map((r) => (
        <div
          key={`${r.y}:${r.x}:${r.width}`}
          aria-hidden
          data-ex-text-ui
          style={{
            position: "absolute",
            left: r.x,
            top: r.y,
            width: r.width,
            height: r.height,
            background: "color-mix(in srgb, var(--primary) 30%, transparent)",
            pointerEvents: "none",
          }}
        />
      ))}
      {collapsed && caret && (
        <div
          aria-hidden
          data-ex-text-ui
          style={{
            position: "absolute",
            left: caret.x,
            top: caret.y,
            width: 2 / zoom,
            height: caret.height,
            background: "var(--primary)",
            pointerEvents: "none",
            animation: "ex-caret-blink 1.06s steps(1) infinite",
          }}
        />
      )}
    </>
  );
};
