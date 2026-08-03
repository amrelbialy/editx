import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getSelectionStyleValueForProperty } from "@lexical/selection";
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
} from "lexical";
import { Bold, Italic, Strikethrough, Underline } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import { IconButton } from "../../ui";

// ── ToolbarPlugin ───────────────────────────────────────────────────
// Inline toolbar rendered inside LexicalComposer — uses Lexical API directly.

export function ToolbarPlugin({ zoom }: { zoom: number }) {
  const { t } = useTranslation();
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
      $getRoot().select(0, $getRoot().getChildrenSize());
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
        <IconButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPropertySidePanel(propertySidePanel === "color" ? null : "color")}
          label={t("block.color")}
          className={cn(
            propertySidePanel === "color"
              ? "bg-primary/20 ring-1 ring-primary/30"
              : "text-muted-foreground",
          )}
          icon={
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: fontColor }}
            />
          }
        />

        {/* Bold */}
        <IconButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleBold}
          label={t("block.bold")}
          variant={isBold ? "default" : "ghost"}
          className={isBold ? undefined : "text-muted-foreground"}
          icon={<Bold className="h-4 w-4" />}
        />

        {/* Italic */}
        <IconButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleItalic}
          label={t("block.italic")}
          variant={isItalic ? "default" : "ghost"}
          className={isItalic ? undefined : "text-muted-foreground"}
          icon={<Italic className="h-4 w-4" />}
        />

        {/* Underline */}
        <IconButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleUnderline}
          label={t("block.underline")}
          variant={isUnderline ? "default" : "ghost"}
          className={isUnderline ? undefined : "text-muted-foreground"}
          icon={<Underline className="h-4 w-4" />}
        />

        {/* Strikethrough */}
        <IconButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleStrikethrough}
          label={t("block.strikethrough")}
          variant={isStrikethrough ? "default" : "ghost"}
          className={isStrikethrough ? undefined : "text-muted-foreground"}
          icon={<Strikethrough className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
