import type { CreativeEngine } from "@creative-editor/engine";
import { Bold, Italic } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useImageEditorStore } from "../../store/image-editor-store";
import { cn } from "../../utils/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";

interface TextEditToolbarProps {
  engine: CreativeEngine;
  blockId: number;
}

function readTargetStyle(engine: CreativeEngine, blockId: number, selectionStart?: number) {
  const runs = engine.block.getTextRuns(blockId);
  let style = runs[0]?.style ?? {};
  if (selectionStart != null && selectionStart > 0) {
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > selectionStart) {
        style = run.style;
        break;
      }
      offset += run.text.length;
    }
  }
  return {
    fontWeight: style.fontWeight ?? "normal",
    fontStyle: style.fontStyle ?? "normal",
    fill: style.fill ?? "#000000",
  };
}

const PRESET_COLORS = [
  "#000000",
  "#ffffff",
  "#ff0000",
  "#00aa00",
  "#0000ff",
  "#ff8800",
  "#8800ff",
  "#00cccc",
  "#ff00ff",
  "#888888",
  "#cc0000",
  "#006600",
];

export const TextEditToolbar: React.FC<TextEditToolbarProps> = ({ engine, blockId }) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const [state, setState] = useState(() =>
    readTargetStyle(engine, blockId, textSelectionRange?.from),
  );

  useEffect(() => {
    setState(readTargetStyle(engine, blockId, textSelectionRange?.from));
  }, [engine, blockId, textSelectionRange]);

  const refresh = useCallback(() => {
    setState(readTargetStyle(engine, blockId, textSelectionRange?.from));
  }, [engine, blockId, textSelectionRange]);

  const hasCharSelection =
    editingTextBlockId === blockId &&
    textSelectionRange !== null &&
    textSelectionRange.from !== textSelectionRange.to;

  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    return { start: 0, end: engine.block.getTextContent(blockId).length };
  }, [engine, blockId, hasCharSelection, textSelectionRange]);

  const handleBoldToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.toggleBoldText(blockId, start, end);
    refresh();
  }, [engine, blockId, getStyleRange, refresh]);

  const handleItalicToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.toggleItalicText(blockId, start, end);
    refresh();
  }, [engine, blockId, getStyleRange, refresh]);

  const handleTextColor = useCallback(
    (color: string) => {
      const { start, end } = getStyleRange();
      engine.block.setTextColor(blockId, start, end, color);
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 h-9 px-1.5",
        "bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg",
        "animate-in fade-in-0 slide-in-from-bottom-1 duration-150",
      )}
      data-text-toolbar
    >
      {/* Color swatch */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onMouseDown={(e) => e.preventDefault()}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: state.fill }}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto p-2" align="center" data-text-toolbar>
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-6 gap-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTextColor(c)}
                  className={cn(
                    "w-6 h-6 rounded-full border transition-transform hover:scale-110",
                    state.fill === c ? "border-primary ring-2 ring-primary/30" : "border-border",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={state.fill}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) handleTextColor(v);
                }}
                className="flex-1 h-7 px-2 text-xs bg-background border border-border rounded-md font-mono"
                maxLength={7}
                data-text-toolbar
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bold */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleBoldToggle}
        className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
          state.fontWeight === "bold"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent",
        )}
      >
        <Bold className="h-4 w-4" />
      </button>

      {/* Italic */}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleItalicToggle}
        className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
          state.fontStyle === "italic"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent",
        )}
      >
        <Italic className="h-4 w-4" />
      </button>
    </div>
  );
};
