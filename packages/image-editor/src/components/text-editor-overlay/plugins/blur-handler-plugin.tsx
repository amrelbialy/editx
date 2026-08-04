import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { BLUR_COMMAND, COMMAND_PRIORITY_LOW } from "lexical";
import { useEffect } from "react";

// ── BlurHandlerPlugin ───────────────────────────────────────────────
// Closes the editor when focus leaves to a non-toolbar element.

export function BlurHandlerPlugin({ onClose }: { onClose: () => void }) {
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
