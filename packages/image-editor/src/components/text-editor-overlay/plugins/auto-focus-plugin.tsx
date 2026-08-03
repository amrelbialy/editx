import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";

// ── AutoFocusPlugin ─────────────────────────────────────────────────

export function AutoFocusPlugin({
  clickScreenPos,
}: {
  clickScreenPos?: { x: number; y: number } | null;
}) {
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
