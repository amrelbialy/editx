import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { COMMAND_PRIORITY_HIGH, KEY_DOWN_COMMAND } from "lexical";
import { useEffect } from "react";

// ── KeyboardShortcutsPlugin ─────────────────────────────────────────
// Handles Ctrl+B/I/U via Lexical commands, Escape → close.

export function KeyboardShortcutsPlugin({ onClose }: { onClose: () => void }) {
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
