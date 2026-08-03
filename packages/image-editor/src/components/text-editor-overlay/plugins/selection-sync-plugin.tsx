import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { useEffect } from "react";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { getSelectionOffsets } from "../../../utils/lexical-bridge";

// ── SelectionSyncPlugin ─────────────────────────────────────────────
// Reports Lexical selection as { from, to } character offsets to the store.

export function SelectionSyncPlugin() {
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
