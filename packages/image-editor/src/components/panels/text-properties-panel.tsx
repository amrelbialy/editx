import { type EditxEngine, TEXT_ALIGN, TEXT_LINE_HEIGHT } from "@editx/engine";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useConfig } from "../../config/config-context";
import { DEFAULT_FONT_FAMILIES } from "../../config/default-config";
import { useImageEditorStore } from "../../store/image-editor-store";
import { ColorSwatch } from "../ui/color-swatch";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";
import { Section } from "../ui/section";
import { SegmentedControl } from "../ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { SliderField } from "../ui/slider-field";

export interface TextPropertiesPanelProps {
  engine: EditxEngine;
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

function readTextBlockState(
  engine: EditxEngine,
  blockId: number,
  selectionStart?: number,
): TextBlockState {
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
    fontFamily: targetStyle.fontFamily ?? "Arial",
    fontWeight: targetStyle.fontWeight ?? "normal",
    fontStyle: targetStyle.fontStyle ?? "normal",
    fill: targetStyle.fill ?? "#000000",
    letterSpacing: targetStyle.letterSpacing ?? 0,
    textAlign: align || "left",
    lineHeight: lh || 1.2,
    opacity: engine.block.getOpacity(blockId),
  };
}

export const TextPropertiesPanel: React.FC<TextPropertiesPanelProps> = ({ engine, blockId }) => {
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);
  const config = useConfig();

  const fontFamilies = config.text?.fonts ?? DEFAULT_FONT_FAMILIES;
  const minFontSize = config.text?.minFontSize ?? 1;
  const maxFontSize = config.text?.maxFontSize ?? 500;

  // Whether we're in inline-editing mode for this block with an active selection
  const hasCharSelection =
    editingTextBlockId === blockId &&
    textSelectionRange !== null &&
    textSelectionRange.from !== textSelectionRange.to;

  const [state, setState] = useState<TextBlockState>(() =>
    readTextBlockState(engine, blockId, textSelectionRange?.from),
  );

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

  const handleFontSize = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val) && val > 0) {
        const clamped = Math.min(maxFontSize, Math.max(minFontSize, val));
        const { start, end } = getStyleRange();
        engine.block.setTextFontSize(blockId, start, end, clamped);
        update();
      }
    },
    [engine, blockId, getStyleRange, update, minFontSize, maxFontSize],
  );

  const handleFontFamily = useCallback(
    (value: string) => {
      const { start, end } = getStyleRange();
      engine.block.setTextFontFamily(blockId, start, end, value);
      update();
    },
    [engine, blockId, getStyleRange, update],
  );

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

  const handleFillColor = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { start, end } = getStyleRange();
      engine.block.setTextColor(blockId, start, end, e.target.value);
      update();
    },
    [engine, blockId, getStyleRange, update],
  );

  const handleLetterSpacing = useCallback(
    ([v]: number[]) => {
      const { start, end } = getStyleRange();
      engine.block.setTextStyle(blockId, start, end, { letterSpacing: v });
      update();
    },
    [engine, blockId, getStyleRange, update],
  );

  const handleTextAlign = useCallback(
    (align: string) => {
      engine.block.setTextAlign(blockId, align);
      update();
    },
    [engine, blockId, update],
  );

  const handleLineHeight = useCallback(
    ([v]: number[]) => {
      engine.block.setTextLineHeight(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  const handleOpacity = useCallback(
    ([v]: number[]) => {
      engine.block.setOpacity(blockId, v);
      update();
    },
    [engine, blockId, update],
  );

  return (
    <div className="flex flex-col gap-fluid" data-text-toolbar>
      <div className="text-fluid font-medium text-muted-foreground uppercase tracking-wider">
        Text Properties
        {hasCharSelection && <span className="ml-1 text-primary normal-case">(selection)</span>}
      </div>

      {/* Font Family */}
      <Section label="Font">
        <Select value={state.fontFamily} onValueChange={handleFontFamily}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontFamilies.map((f) => (
              <SelectItem key={f} value={f}>
                <span style={{ fontFamily: f }}>{f}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      {/* Font Size */}
      <Section label="Size">
        <Input
          type="number"
          value={Math.round(state.fontSize)}
          onChange={handleFontSize}
          min={minFontSize}
          max={maxFontSize}
          suffix="px"
          className="w-24"
        />
      </Section>

      {/* Bold / Italic toggles */}
      <Section label="Style">
        <div className="flex gap-1">
          <IconButton
            size="sm"
            className="h-8 w-8"
            variant={state.fontWeight === "bold" ? "default" : "secondary"}
            onClick={handleBoldToggle}
            label="Bold"
            icon={<Bold className="h-4 w-4" />}
          />
          <IconButton
            size="sm"
            className="h-8 w-8"
            variant={state.fontStyle === "italic" ? "default" : "secondary"}
            onClick={handleItalicToggle}
            label="Italic"
            icon={<Italic className="h-4 w-4" />}
          />
        </div>
      </Section>

      {/* Text Color */}
      <Section label="Color">
        <div className="flex items-center gap-2">
          <ColorSwatch value={state.fill} onChange={handleFillColor} />
          <span className="text-fluid font-mono text-muted-foreground">{state.fill}</span>
        </div>
      </Section>

      <Separator />

      {/* Alignment */}
      <Section label="Alignment">
        <SegmentedControl
          ariaLabel="Text alignment"
          value={state.textAlign as "left" | "center" | "right"}
          onValueChange={handleTextAlign}
          options={[
            { value: "left", label: <AlignLeft className="h-4 w-4" />, ariaLabel: "Left" },
            { value: "center", label: <AlignCenter className="h-4 w-4" />, ariaLabel: "Center" },
            { value: "right", label: <AlignRight className="h-4 w-4" />, ariaLabel: "Right" },
          ]}
        />
      </Section>

      {/* Letter Spacing */}
      <SliderField
        label="Letter Spacing"
        value={state.letterSpacing}
        min={-5}
        max={20}
        step={0.5}
        onChange={(v) => handleLetterSpacing([v])}
        formatValue={(v) => v.toFixed(1)}
      />

      {/* Line Height */}
      <SliderField
        label="Line Height"
        value={state.lineHeight}
        min={0.5}
        max={3}
        step={0.1}
        onChange={(v) => handleLineHeight([v])}
        formatValue={(v) => v.toFixed(1)}
      />

      <Separator />

      {/* Opacity */}
      <SliderField
        label="Opacity"
        value={state.opacity}
        min={0}
        max={1}
        step={0.01}
        onChange={(v) => handleOpacity([v])}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
    </div>
  );
};
