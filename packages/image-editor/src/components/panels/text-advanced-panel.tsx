import type { CreativeEngine, TextRunStyle } from "@creative-editor/engine";
import { TEXT_LINE_HEIGHT, TEXT_VERTICAL_ALIGN } from "@creative-editor/engine";
import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useImageEditorStore } from "../../store/image-editor-store";
import { cn } from "../../utils/cn";
import { Section } from "../ui/section";
import { Separator } from "../ui/separator";
import { SliderField } from "../ui/slider-field";

interface TextAdvancedPanelProps {
  engine: CreativeEngine;
  blockId: number;
}

interface AdvancedState {
  verticalAlign: string;
  lineHeight: number;
  letterSpacing: number;
  textTransform: string;
  textStrokeColor: string;
  textStrokeWidth: number;
}

function readAdvancedState(
  engine: CreativeEngine,
  blockId: number,
  selectionStart?: number,
): AdvancedState {
  const runs = engine.block.getTextRuns(blockId);
  const vAlign = engine.block.getString(blockId, TEXT_VERTICAL_ALIGN);
  const lh = engine.block.getFloat(blockId, TEXT_LINE_HEIGHT);

  let targetStyle: TextRunStyle = runs[0]?.style ?? {};
  if (selectionStart != null && selectionStart > 0) {
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > selectionStart) {
        targetStyle = run.style;
        break;
      }
      offset += run.text.length;
    }
  }

  return {
    verticalAlign: vAlign || "top",
    lineHeight: lh || 1.2,
    letterSpacing: targetStyle.letterSpacing ?? 0,
    textTransform: targetStyle.textTransform ?? "none",
    textStrokeColor: targetStyle.textStrokeColor ?? "#ffffff",
    textStrokeWidth: targetStyle.textStrokeWidth ?? 0,
  };
}

export const TextAdvancedPanel: React.FC<TextAdvancedPanelProps> = ({ engine, blockId }) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const hasCharSelection =
    editingTextBlockId === blockId &&
    textSelectionRange !== null &&
    textSelectionRange.from !== textSelectionRange.to;

  const [state, setState] = useState<AdvancedState>(() =>
    readAdvancedState(engine, blockId, textSelectionRange?.from),
  );

  useEffect(() => {
    setState(readAdvancedState(engine, blockId, textSelectionRange?.from));
  }, [engine, blockId, textSelectionRange]);

  const refresh = useCallback(() => {
    setState(readAdvancedState(engine, blockId, textSelectionRange?.from));
  }, [engine, blockId, textSelectionRange]);

  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    return { start: 0, end: engine.block.getTextContent(blockId).length };
  }, [engine, blockId, hasCharSelection, textSelectionRange]);

  // Re-sync on undo/redo
  useEffect(() => {
    const handler = () => refresh();
    engine.on("history:undo", handler);
    engine.on("history:redo", handler);
    return () => {
      engine.off("history:undo", handler);
      engine.off("history:redo", handler);
    };
  }, [engine, refresh]);

  // ── Handlers ──

  const handleVerticalAlign = useCallback(
    (align: string) => {
      engine.block.setTextVerticalAlign(blockId, align);
      refresh();
    },
    [engine, blockId, refresh],
  );

  const handleLineHeight = useCallback(
    ([v]: number[]) => {
      engine.block.setTextLineHeight(blockId, v);
      refresh();
    },
    [engine, blockId, refresh],
  );

  const handleLetterSpacing = useCallback(
    ([v]: number[]) => {
      const { start, end } = getStyleRange();
      engine.block.setTextStyle(blockId, start, end, { letterSpacing: v });
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleTextTransform = useCallback(
    (transform: "none" | "uppercase" | "lowercase" | "capitalize") => {
      const { start, end } = getStyleRange();
      engine.block.setTextTransform(blockId, start, end, transform);
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleStrokeColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { start, end } = getStyleRange();
      engine.block.setTextStroke(blockId, start, end, {
        color: e.target.value,
        width: state.textStrokeWidth || 1,
      });
      refresh();
    },
    [engine, blockId, getStyleRange, state.textStrokeWidth, refresh],
  );

  const handleStrokeWidth = useCallback(
    ([v]: number[]) => {
      const { start, end } = getStyleRange();
      engine.block.setTextStroke(blockId, start, end, {
        color: state.textStrokeColor,
        width: v,
      });
      refresh();
    },
    [engine, blockId, getStyleRange, state.textStrokeColor, refresh],
  );

  const CASE_OPTIONS = [
    { value: "none", label: "—" },
    { value: "uppercase", label: "AG" },
    { value: "lowercase", label: "ag" },
    { value: "capitalize", label: "Ag" },
  ] as const;

  return (
    <div className="flex flex-col gap-4" data-text-toolbar>
      {/* Vertical Alignment */}
      <Section label="Vertical Alignment">
        <div className="flex gap-1">
          {(
            [
              ["top", AlignVerticalJustifyStart],
              ["middle", AlignVerticalJustifyCenter],
              ["bottom", AlignVerticalJustifyEnd],
            ] as const
          ).map(([align, Icon]) => (
            <button
              key={align}
              onClick={() => handleVerticalAlign(align)}
              className={cn(
                "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                state.verticalAlign === align
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
              title={align.charAt(0).toUpperCase() + align.slice(1)}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </Section>

      {/* Line Height */}
      <Section label="Line Height">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={state.lineHeight.toFixed(1)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v) && v > 0) {
                engine.block.setTextLineHeight(blockId, v);
                refresh();
              }
            }}
            min={0.5}
            max={4}
            step={0.1}
            className="w-14 h-7 rounded-md border border-border bg-background px-1.5 text-xs text-center tabular-nums"
          />
          <SliderField
            label=""
            value={state.lineHeight}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(v) => handleLineHeight([v])}
            formatValue={() => ""}
            className="flex-1"
          />
        </div>
      </Section>

      {/* Letter Case */}
      <Section label="Letter Case">
        <div className="flex gap-1">
          {CASE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleTextTransform(opt.value)}
              className={cn(
                "h-8 px-3 rounded-md text-xs font-medium transition-colors",
                state.textTransform === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Letter Spacing */}
      <Section label="Letter Spacing">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={state.letterSpacing.toFixed(1)}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!Number.isNaN(v)) {
                const { start, end } = getStyleRange();
                engine.block.setTextStyle(blockId, start, end, { letterSpacing: v });
                refresh();
              }
            }}
            step={0.5}
            className="w-14 h-7 rounded-md border border-border bg-background px-1.5 text-xs text-center tabular-nums"
          />
          <SliderField
            label=""
            value={state.letterSpacing}
            min={-5}
            max={20}
            step={0.5}
            onChange={(v) => handleLetterSpacing([v])}
            formatValue={() => ""}
            className="flex-1"
          />
        </div>
      </Section>

      <Separator />

      {/* Text Stroke */}
      <Section label="Text Stroke">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12">Color</span>
            <input
              type="color"
              value={state.textStrokeColor}
              onChange={handleStrokeColor}
              className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
            />
            <span className="text-xs font-mono text-muted-foreground">{state.textStrokeColor}</span>
          </div>
          <SliderField
            label="Width"
            value={state.textStrokeWidth}
            min={0}
            max={5}
            step={0.5}
            onChange={(v) => handleStrokeWidth([v])}
            formatValue={(v) => v.toFixed(1)}
          />
        </div>
      </Section>
    </div>
  );
};
