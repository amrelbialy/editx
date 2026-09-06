import {
  type EditxEngine,
  TEXT_ALIGN,
  TEXT_LINE_HEIGHT,
  TEXT_PADDING,
  TEXT_VERTICAL_ALIGN,
} from "@editx/engine";
import {
  createLexicalComposerContext,
  LexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import type { LexicalEditor } from "lexical";
import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { useImageEditorStore } from "../../store/image-editor-store";
import {
  AutoFocusPlugin,
  BlurHandlerPlugin,
  KeyboardShortcutsPlugin,
  PastePlainTextPlugin,
  SelectionSyncPlugin,
  ToolbarPlugin,
} from "./plugins";
import { toOverlayPositionStyle } from "./text-editor-overlay-geometry";
import { TextSelectionLayer } from "./text-selection-layer.component";

export interface TextEditorOverlayProps {
  engine: EditxEngine;
  blockId: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** Screen coordinates of the double-click that initiated editing. */
  clickScreenPos?: { x: number; y: number } | null;
  onClose: () => void;
}

// ── TextEditorOverlay ───────────────────────────────────────────────

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  engine,
  blockId,
  canvasRef: _canvasRef,
  clickScreenPos,
  onClose,
}) => {
  // Compute screen position and size of the text block
  const getOverlayStyle = useCallback((): React.CSSProperties => {
    const pos = engine.block.getPosition(blockId);
    const size = engine.block.getSize(blockId);
    const zoom = engine.editor.getZoom();
    const rotation = engine.block.getRotation(blockId);

    const topLeft = engine.editor.worldToScreen({ x: pos.x, y: pos.y });
    const positionStyle = toOverlayPositionStyle(
      engine.editor._getBlockScreenTransform(blockId),
      topLeft ? { x: topLeft.x, y: topLeft.y, zoom, rotation } : null,
    );
    if (positionStyle.display === "none") return positionStyle;

    const align = engine.block.getString(blockId, TEXT_ALIGN) || "left";
    const lineHeight = engine.block.getFloat(blockId, TEXT_LINE_HEIGHT) ?? 1.2;
    const padding = engine.block.getFloat(blockId, TEXT_PADDING) ?? 0;

    // Read the block's default font from the first text run so Lexical
    // paragraph layout matches the Konva canvas rendering.
    const verticalAlign = engine.block.getString(blockId, TEXT_VERTICAL_ALIGN) || "top";

    const runs = engine.block.getTextRuns(blockId);
    const firstStyle = runs[0]?.style;
    const fontSize = firstStyle?.fontSize ?? 16;
    const fontFamily = firstStyle?.fontFamily ?? "Arial";
    const letterSpacing = firstStyle?.letterSpacing ?? 0;
    const textTransform = firstStyle?.textTransform ?? "none";

    // Map vertical align to flexbox alignment
    const justifyMap = { top: "flex-start", middle: "center", bottom: "flex-end" } as const;
    const justifyContent = justifyMap[verticalAlign as keyof typeof justifyMap] ?? "flex-start";

    return {
      position: "absolute",
      display: "flex",
      flexDirection: "column" as const,
      justifyContent,
      ...positionStyle,
      width: size.width,
      height: size.height,
      textAlign: align as React.CSSProperties["textAlign"],
      // Native glyphs/caret are hidden; keep line-height so the invisible DOM
      // line boxes stay aligned with the Konva line bands for click hit-testing.
      lineHeight: String(lineHeight),
      fontSize: `${fontSize}px`,
      fontFamily,
      letterSpacing: letterSpacing !== 0 ? `${letterSpacing}px` : undefined,
      textTransform: textTransform as React.CSSProperties["textTransform"],
      padding: `${padding}px`,
      zIndex: 50,
      overflow: "visible",
      borderRadius: "2px",
      background: "transparent",
      boxSizing: "border-box",
      color: "transparent",
      caretColor: "transparent",
      outline: `${3 / zoom}px solid var(--primary)`,
      outlineOffset: "0px",
    } as React.CSSProperties;
  }, [engine, blockId]);

  // Get or start a TextEditorSession from engine
  const session = useMemo(() => engine.block.beginTextEditing(blockId), [engine, blockId]);
  const editor = session.getEditor();

  // Re-run the style (which reads the auto-sized block height) whenever the
  // editing selection/content changes, so the outline box tracks new lines.
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  // biome-ignore lint/correctness/useExhaustiveDependencies: textSelectionRange forces a re-read of the auto-sized height
  const overlayStyle = useMemo(getOverlayStyle, [getOverlayStyle, textSelectionRange]);

  // Build the LexicalComposerContext value for child plugins
  const composerCtx: [LexicalEditor, ReturnType<typeof createLexicalComposerContext>] = useMemo(
    () => [
      editor,
      createLexicalComposerContext(
        null, // parent context
        { paragraph: "lexical-paragraph" }, // theme
      ),
    ],
    [editor],
  );

  // Attach / detach the Lexical editor root element
  const contentRef = useCallback(
    (el: HTMLElement | null) => {
      editor.setRootElement(el);
    },
    [editor],
  );

  // Hide the transformer while overlay is active; restore on unmount.
  useEffect(() => {
    engine.block.setTransformerEnabled(false);
    return () => {
      engine.block.setTransformerEnabled(true);
    };
  }, [engine]);

  // Cleanup: end the editing session on unmount
  useEffect(() => {
    return () => {
      editor.setRootElement(null);
      engine.block.endTextEditing(blockId);
    };
  }, [engine, blockId, editor]);

  return (
    <div style={overlayStyle} data-testid="text-editor-overlay" data-text-editor-overlay>
      <LexicalComposerContext.Provider value={composerCtx}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              ref={contentRef}
              className="cursor-text whitespace-pre-wrap wrap-break-word outline-none"
              style={{ minHeight: "1em" }}
            />
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <AutoFocusPlugin clickScreenPos={clickScreenPos} />
        <SelectionSyncPlugin />
        <KeyboardShortcutsPlugin onClose={onClose} />
        <PastePlainTextPlugin />
        <BlurHandlerPlugin onClose={onClose} />
        <ToolbarPlugin zoom={engine.editor.getZoom()} />
        <TextSelectionLayer engine={engine} blockId={blockId} zoom={engine.editor.getZoom()} />
      </LexicalComposerContext.Provider>
    </div>
  );
};
