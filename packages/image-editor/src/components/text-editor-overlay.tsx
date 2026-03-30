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
  useLexicalComposerContext,
} from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { $getSelectionStyleValueForProperty } from "@lexical/selection";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  BLUR_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
  PASTE_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { Bold, Italic, Strikethrough, Underline } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useImageEditorStore } from "../store/image-editor-store";
import { cn } from "../utils/cn";
import { getSelectionOffsets } from "../utils/lexical-bridge";

export interface TextEditorOverlayProps {
  engine: EditxEngine;
  blockId: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  /** Screen coordinates of the double-click that initiated editing. */
  clickScreenPos?: { x: number; y: number } | null;
  onClose: () => void;
}

// ── SelectionSyncPlugin ─────────────────────────────────────────────
// Reports Lexical selection as { from, to } character offsets to the store.

function SelectionSyncPlugin() {
  const [editor] = useLexicalComposerContext();
  const setTextSelectionRange = useImageEditorStore((s) => s.setTextSelectionRange);

  useEffect(() => {
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      const offsets = getSelectionOffsets(editorState);
      if (offsets) {
        setTextSelectionRange(offsets);
      }
    });
    return unregister;
  }, [editor, setTextSelectionRange]);

  return null;
}

// ── KeyboardShortcutsPlugin ─────────────────────────────────────────
// Handles Ctrl+B/I/U via Lexical commands, Escape → close.

function KeyboardShortcutsPlugin({ onClose }: { onClose: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
          return true;
        }

        const isCtrl = event.ctrlKey || event.metaKey;
        if (!isCtrl) return false;

        // Ctrl+B/I/U are handled natively by Lexical's FORMAT_TEXT_COMMAND
        // (RichTextPlugin registers them). We only intercept Escape here.
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, onClose]);

  return null;
}

// ── PastePlainTextPlugin ────────────────────────────────────────────
// Strips formatting from pasted content — plain text only.

function PastePlainTextPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      PASTE_COMMAND,
      (event) => {
        if (event instanceof ClipboardEvent) {
          event.preventDefault();
          const text = event.clipboardData?.getData("text/plain") ?? "";
          if (text) {
            editor.update(() => {
              const sel = $getSelection();
              if ($isRangeSelection(sel)) {
                sel.insertRawText(text);
              }
            });
          }
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

// ── BlurHandlerPlugin ───────────────────────────────────────────────
// Closes the editor when focus leaves to a non-toolbar element.

function BlurHandlerPlugin({ onClose }: { onClose: () => void }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      BLUR_COMMAND,
      (event: FocusEvent) => {
        const related = event.relatedTarget as HTMLElement | null;
        // Fast path: focus stayed on a known toolbar element
        if (related?.closest("[data-text-toolbar]")) return false;

        // Delayed check: Radix portals may not be the relatedTarget
        setTimeout(() => {
          const active = document.activeElement as HTMLElement | null;
          if (!active) {
            onClose();
            return;
          }
          // Still focused in the editor
          const rootEl = editor.getRootElement();
          if (rootEl?.contains(active)) return;
          // Focused on a toolbar element
          if (active.closest("[data-text-toolbar]")) return;
          // Focused inside a Radix portal
          if (active.closest("[data-radix-popper-content-wrapper]")) return;
          if (active.closest('[role="listbox"]')) return;
          if (active.closest('[role="menu"]')) return;
          if (active.closest('[role="dialog"]')) return;

          onClose();
        }, 10);

        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onClose]);

  return null;
}

// ── AutoFocusPlugin ─────────────────────────────────────────────────

function AutoFocusPlugin({ clickScreenPos }: { clickScreenPos?: { x: number; y: number } | null }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.focus(
      () => {
        const root = editor.getRootElement();
        root?.focus({ preventScroll: true });

        if (!clickScreenPos) return;

        // Use the browser's hit-test API to find the DOM position at the click point
        const { x, y } = clickScreenPos;
        let domNode: Node | null = null;
        let offset = 0;

        if (document.caretPositionFromPoint) {
          const pos = document.caretPositionFromPoint(x, y);
          if (pos) {
            domNode = pos.offsetNode;
            offset = pos.offset;
          }
        } else if (document.caretRangeFromPoint) {
          const range = document.caretRangeFromPoint(x, y);
          if (range) {
            domNode = range.startContainer;
            offset = range.startOffset;
          }
        }

        if (!domNode) return;

        // Verify the hit node is inside the editor root
        if (!root?.contains(domNode)) return;

        // Create a native selection at the hit point — Lexical will sync from it
        const sel = window.getSelection();
        if (sel) {
          sel.collapse(domNode, offset);
        }
      },
      { defaultSelection: "rootStart" },
    );
  }, [editor, clickScreenPos]);

  return null;
}

// ── ToolbarPlugin ───────────────────────────────────────────────────
// Inline toolbar rendered inside LexicalComposer — uses Lexical API directly.

// ── ToolbarPlugin ───────────────────────────────────────────────────
// Inline toolbar rendered inside LexicalComposer — uses Lexical API directly.

function ToolbarPlugin({ zoom }: { zoom: number }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [fontColor, setFontColor] = useState("#000000");
  const setPropertySidePanel = useImageEditorStore((s) => s.setPropertySidePanel);
  const propertySidePanel = useImageEditorStore((s) => s.propertySidePanel);

  // Read toolbar state from selection on every change
  const $updateToolbar = useCallback(() => {
    const sel = $getSelection();
    if ($isRangeSelection(sel)) {
      setIsBold(sel.hasFormat("bold"));
      setIsItalic(sel.hasFormat("italic"));
      setIsUnderline(sel.hasFormat("underline"));
      setIsStrikethrough(sel.hasFormat("strikethrough"));
      setFontColor($getSelectionStyleValueForProperty(sel, "color", "#000000"));
    }
  }, []);

  useEffect(() => {
    const unsubUpdate = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => $updateToolbar());
    });
    const unsubSelection = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        $updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    return () => {
      unsubUpdate();
      unsubSelection();
    };
  }, [editor, $updateToolbar]);

  // When nothing is selected (collapsed cursor), select all text first
  const $selectAllIfCollapsed = useCallback((): boolean => {
    const sel = $getSelection();
    if ($isRangeSelection(sel) && sel.isCollapsed()) {
      $getRoot().selectStart();
      const _newSel = $getRoot().select(0, $getRoot().getChildrenSize());
      return true;
    }
    return false;
  }, []);

  const handleBold = useCallback(() => {
    editor.update(() => {
      const wasCollapsed = $selectAllIfCollapsed();
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold");
      if (wasCollapsed) {
        // Restore collapsed cursor at end
        $getRoot().selectEnd();
      }
    });
  }, [editor, $selectAllIfCollapsed]);

  const handleItalic = useCallback(() => {
    editor.update(() => {
      const wasCollapsed = $selectAllIfCollapsed();
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic");
      if (wasCollapsed) {
        $getRoot().selectEnd();
      }
    });
  }, [editor, $selectAllIfCollapsed]);

  const handleUnderline = useCallback(() => {
    editor.update(() => {
      const wasCollapsed = $selectAllIfCollapsed();
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline");
      if (wasCollapsed) {
        $getRoot().selectEnd();
      }
    });
  }, [editor, $selectAllIfCollapsed]);

  const handleStrikethrough = useCallback(() => {
    editor.update(() => {
      const wasCollapsed = $selectAllIfCollapsed();
      editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
      if (wasCollapsed) {
        $getRoot().selectEnd();
      }
    });
  }, [editor, $selectAllIfCollapsed]);

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        bottom: "100%",
        left: "50%",
        transform: `translateX(-50%) scale(${1 / zoom})`,
        transformOrigin: "bottom center",
        marginBottom: 8,
      }}
    >
      <div
        className={cn(
          "inline-flex items-center gap-1 h-9 px-1.5",
          "bg-card/95 backdrop-blur-sm border border-border rounded-lg shadow-lg",
          "animate-in fade-in-0 slide-in-from-bottom-1 duration-150",
          "text-foreground",
        )}
        data-text-toolbar
      >
        {/* Color swatch — opens color panel */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPropertySidePanel(propertySidePanel === "color" ? null : "color")}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
            propertySidePanel === "color"
              ? "bg-primary/20 ring-1 ring-primary/30"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <div
            className="w-4 h-4 rounded-full border border-border"
            style={{ backgroundColor: fontColor }}
          />
        </button>

        {/* Bold */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleBold}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
            isBold ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Bold className="h-4 w-4" />
        </button>

        {/* Italic */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleItalic}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
            isItalic
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Italic className="h-4 w-4" />
        </button>

        {/* Underline */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleUnderline}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
            isUnderline
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Underline className="h-4 w-4" />
        </button>

        {/* Strikethrough */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleStrikethrough}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
            isStrikethrough
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent",
          )}
        >
          <Strikethrough className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
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

    if (!topLeft) return { display: "none" };

    const align = engine.block.getString(blockId, TEXT_ALIGN) || "left";
    const lineHeight = engine.block.getFloat(blockId, TEXT_LINE_HEIGHT) ?? 1.2;
    const padding = engine.block.getFloat(blockId, TEXT_PADDING) ?? 0;

    // Read the block's default font from the first text run so Lexical
    // paragraph layout matches the Konva canvas rendering.
    const verticalAlign = engine.block.getString(blockId, TEXT_VERTICAL_ALIGN) || "top";

    // Read the block's default font from the first text run so Lexical
    // paragraph layout matches the Konva canvas rendering.
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
      left: topLeft.x,
      top: topLeft.y,
      width: size.width,
      height: size.height,
      transform: `scale(${zoom}) rotate(${rotation}deg)`,
      transformOrigin: "top left",
      textAlign: align as React.CSSProperties["textAlign"],
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
      caretColor: "var(--primary)",
      outline: `${3 / zoom}px solid var(--primary)`,
      outlineOffset: "0px",
    };
  }, [engine, blockId]);

  // Hide the transformer while overlay is active; restore on unmount.
  useEffect(() => {
    engine.block.setTransformerEnabled(false);
    return () => {
      engine.block.setTransformerEnabled(true);
    };
  }, [engine]);

  // Get or start a TextEditorSession from engine
  const session = useMemo(() => engine.block.beginTextEditing(blockId), [engine, blockId]);
  const editor = session.getEditor();

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

  // Cleanup: end the editing session on unmount
  useEffect(() => {
    return () => {
      editor.setRootElement(null);
      engine.block.endTextEditing(blockId);
    };
  }, [engine, blockId, editor]);

  return (
    <div style={getOverlayStyle()} data-testid="text-editor-overlay" data-text-editor-overlay>
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
      </LexicalComposerContext.Provider>
    </div>
  );
};
