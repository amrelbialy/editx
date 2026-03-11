import React, { useCallback, useEffect, useState } from 'react';
import {
  type CreativeEngine,
  type TextRun,
  TEXT_ALIGN,
  TEXT_LINE_HEIGHT,
} from '@creative-editor/engine';
import { Slider } from '../ui/slider';
import { Separator } from '../ui/separator';
import { useImageEditorStore } from '../../store/image-editor-store';

export interface TextPropertiesPanelProps {
  engine: CreativeEngine;
  blockId: number;
}

interface TextBlockState {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  fill: string;
  letterSpacing: number;
  textAlign: string;
  lineHeight: number;
  opacity: number;
}

const FONT_FAMILIES = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana'];

function readTextBlockState(engine: CreativeEngine, blockId: number, selectionStart?: number): TextBlockState {
  const runs = engine.block.getTextRuns(blockId);
  const align = engine.block.getString(blockId, TEXT_ALIGN);
  const lh = engine.block.getFloat(blockId, TEXT_LINE_HEIGHT);

  // Find the style at the selection cursor position, or default to first run
  let targetStyle = runs[0]?.style ?? {};
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
    fontSize: targetStyle.fontSize ?? 24,
    fontFamily: targetStyle.fontFamily ?? 'Arial',
    fontWeight: targetStyle.fontWeight ?? 'normal',
    fontStyle: targetStyle.fontStyle ?? 'normal',
    fill: targetStyle.fill ?? '#000000',
    letterSpacing: targetStyle.letterSpacing ?? 0,
    textAlign: align || 'left',
    lineHeight: lh || 1.2,
    opacity: engine.block.getOpacity(blockId),
  };
}

export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({ engine, blockId }) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  // Whether we're in inline-editing mode for this block with an active selection
  const hasCharSelection = editingTextBlockId === blockId && textSelectionRange !== null
    && textSelectionRange.from !== textSelectionRange.to;

  const [state, setState] = useState<TextBlockState>(() => readTextBlockState(engine, blockId, textSelectionRange?.from));

  useEffect(() => {
    setState(readTextBlockState(engine, blockId, textSelectionRange?.from));
  }, [engine, blockId, textSelectionRange]);

  const update = useCallback(() => {
    setState(readTextBlockState(engine, blockId, textSelectionRange?.from));
  }, [engine, blockId, textSelectionRange]);

  /** Get the range to apply styles to: selection range if chars are selected, otherwise full text. */
  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    return { start: 0, end: engine.block.getTextContent(blockId).length };
  }, [engine, blockId, hasCharSelection, textSelectionRange]);

  // --- Handlers ---

  const handleFontSize = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      const { start, end } = getStyleRange();
      engine.block.setTextFontSize(blockId, start, end, val);
      update();
    }
  }, [engine, blockId, getStyleRange, update]);

  const handleFontFamily = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const { start, end } = getStyleRange();
    engine.block.setTextFontFamily(blockId, start, end, e.target.value);
    update();
  }, [engine, blockId, getStyleRange, update]);

  const handleBoldToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.toggleBoldText(blockId, start, end);
    update();
  }, [engine, blockId, getStyleRange, update]);

  const handleItalicToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.toggleItalicText(blockId, start, end);
    update();
  }, [engine, blockId, getStyleRange, update]);

  const handleFillColor = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { start, end } = getStyleRange();
    engine.block.setTextColor(blockId, start, end, e.target.value);
    update();
  }, [engine, blockId, getStyleRange, update]);

  const handleLetterSpacing = useCallback(([v]: number[]) => {
    const { start, end } = getStyleRange();
    engine.block.setTextStyle(blockId, start, end, { letterSpacing: v });
    update();
  }, [engine, blockId, getStyleRange, update]);

  const handleTextAlign = useCallback((align: string) => {
    engine.block.setTextAlign(blockId, align);
    update();
  }, [engine, blockId, update]);

  const handleLineHeight = useCallback(([v]: number[]) => {
    engine.block.setTextLineHeight(blockId, v);
    update();
  }, [engine, blockId, update]);

  const handleOpacity = useCallback(([v]: number[]) => {
    engine.block.setOpacity(blockId, v);
    update();
  }, [engine, blockId, update]);

  return (
    <div className="flex flex-col gap-3" data-text-toolbar>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Text Properties
        {hasCharSelection && (
          <span className="ml-1 text-primary normal-case">(selection)</span>
        )}
      </div>

      {/* Font Family */}
      <Section label="Font">
        <select
          value={state.fontFamily}
          onChange={handleFontFamily}
          className="w-full h-8 rounded-md border border-border bg-background px-2 text-sm"
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </Section>

      {/* Font Size */}
      <Section label="Size">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={Math.round(state.fontSize)}
            onChange={handleFontSize}
            min={1}
            max={500}
            className="w-16 h-8 rounded-md border border-border bg-background px-2 text-sm text-center tabular-nums"
          />
          <span className="text-xs text-muted-foreground">px</span>
        </div>
      </Section>

      {/* Bold / Italic toggles */}
      <Section label="Style">
        <div className="flex gap-1">
          <button
            onClick={handleBoldToggle}
            className={`h-8 w-8 rounded-md text-sm font-bold transition-colors ${
              state.fontWeight === 'bold'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            B
          </button>
          <button
            onClick={handleItalicToggle}
            className={`h-8 w-8 rounded-md text-sm italic transition-colors ${
              state.fontStyle === 'italic'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            I
          </button>
        </div>
      </Section>

      {/* Text Color */}
      <Section label="Color">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={state.fill}
            onChange={handleFillColor}
            className="w-8 h-8 rounded border border-border bg-transparent cursor-pointer"
          />
          <span className="text-xs font-mono text-muted-foreground">{state.fill}</span>
        </div>
      </Section>

      <Separator />

      {/* Alignment */}
      <Section label="Alignment">
        <div className="flex gap-1">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button
              key={align}
              onClick={() => handleTextAlign(align)}
              className={`h-8 px-3 rounded-md text-xs transition-colors ${
                state.textAlign === align
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {align.charAt(0).toUpperCase() + align.slice(1)}
            </button>
          ))}
        </div>
      </Section>

      {/* Letter Spacing */}
      <Section label="Letter Spacing">
        <div className="flex items-center gap-2">
          <Slider
            min={-5}
            max={20}
            step={0.5}
            value={[state.letterSpacing]}
            onValueChange={handleLetterSpacing}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {state.letterSpacing.toFixed(1)}
          </span>
        </div>
      </Section>

      {/* Line Height */}
      <Section label="Line Height">
        <div className="flex items-center gap-2">
          <Slider
            min={0.5}
            max={3}
            step={0.1}
            value={[state.lineHeight]}
            onValueChange={handleLineHeight}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {state.lineHeight.toFixed(1)}
          </span>
        </div>
      </Section>

      <Separator />

      {/* Opacity */}
      <Section label="Opacity">
        <div className="flex items-center gap-2">
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[state.opacity]}
            onValueChange={handleOpacity}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {Math.round(state.opacity * 100)}%
          </span>
        </div>
      </Section>
    </div>
  );
};

// ── Helper ──

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
