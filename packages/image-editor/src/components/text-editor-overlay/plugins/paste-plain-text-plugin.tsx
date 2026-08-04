import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_HIGH, PASTE_COMMAND } from "lexical";
import { useEffect } from "react";

// ── PastePlainTextPlugin ────────────────────────────────────────────
// Strips formatting from pasted content — plain text only.

export function PastePlainTextPlugin() {
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
