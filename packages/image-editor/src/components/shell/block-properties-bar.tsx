import React, { useCallback, useEffect, useState } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import {
  colorToHex,
  FILL_SOLID_COLOR,
  TEXT_ALIGN,
} from '@creative-editor/engine';
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CircleOff,
  Paintbrush,
  Sun,
  Grid2x2,
  Move,
  MoreHorizontal,
  ChevronDown,
  Sparkles,
  SlidersHorizontal,
  Palette,
  ImageIcon,
} from 'lucide-react';
import { Slider } from '../ui/slider';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from '../ui/dropdown-menu';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Separator } from '../ui/separator';
import { useImageEditorStore } from '../../store/image-editor-store';
import type { PropertySidePanel } from '../../store/image-editor-store';
import { cn } from '../../utils/cn';

interface BlockPropertiesBarProps {
  engine: CreativeEngine;
  blockId: number;
  blockType: 'text' | 'graphic' | 'image';
}

const FONT_FAMILIES = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Courier New', 'Verdana'];

// ── State readers ──

function readTextState(engine: CreativeEngine, blockId: number, selectionStart?: number) {
  const runs = engine.block.getTextRuns(blockId);
  const align = engine.block.getString(blockId, TEXT_ALIGN);

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
    textAlign: align || 'left',
    opacity: engine.block.getOpacity(blockId),
  };
}

function readBlockColor(engine: CreativeEngine, blockId: number): string {
  const fillId = engine.block.getFill(blockId);
  if (fillId != null) {
    const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
    if (c) return colorToHex(c).substring(0, 7);
  }
  return '#4a90e2';
}

// ── Main Component ──

export const BlockPropertiesBar: React.FC<BlockPropertiesBarProps> = ({ engine, blockId, blockType }) => {
  const propertySidePanel = useImageEditorStore((s) => s.propertySidePanel);
  const setPropertySidePanel = useImageEditorStore((s) => s.setPropertySidePanel);
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const isText = blockType === 'text';
  const isImage = blockType === 'image';

  // State
  const [textState, setTextState] = useState(() =>
    isText ? readTextState(engine, blockId, textSelectionRange?.from) : null,
  );
  const [fillColor, setFillColor] = useState(() =>
    !isText && !isImage ? readBlockColor(engine, blockId) : '#000000',
  );
  const [opacity, setOpacity] = useState(() => engine.block.getOpacity(blockId));

  // Sync on changes
  useEffect(() => {
    if (isText) {
      setTextState(readTextState(engine, blockId, textSelectionRange?.from));
    } else if (!isImage) {
      setFillColor(readBlockColor(engine, blockId));
    }
    setOpacity(engine.block.getOpacity(blockId));
  }, [engine, blockId, isText, isImage, textSelectionRange]);

  const refresh = useCallback(() => {
    if (isText) {
      setTextState(readTextState(engine, blockId, textSelectionRange?.from));
    } else if (!isImage) {
      setFillColor(readBlockColor(engine, blockId));
    }
    setOpacity(engine.block.getOpacity(blockId));
  }, [engine, blockId, isText, isImage, textSelectionRange]);

  // ── Selection-aware style range ──
  const hasCharSelection = editingTextBlockId === blockId && textSelectionRange !== null
    && textSelectionRange.from !== textSelectionRange.to;

  const getStyleRange = useCallback((): { start: number; end: number } => {
    if (hasCharSelection && textSelectionRange) {
      return { start: textSelectionRange.from, end: textSelectionRange.to };
    }
    return { start: 0, end: engine.block.getTextContent(blockId).length };
  }, [engine, blockId, hasCharSelection, textSelectionRange]);

  // ── Text handlers ──
  const handleFontFamily = useCallback((value: string) => {
    const { start, end } = getStyleRange();
    engine.block.setTextFontFamily(blockId, start, end, value);
    refresh();
  }, [engine, blockId, getStyleRange, refresh]);

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

  const handleFontSize = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val > 0) {
      const { start, end } = getStyleRange();
      engine.block.setTextFontSize(blockId, start, end, val);
      refresh();
    }
  }, [engine, blockId, getStyleRange, refresh]);

  const handleTextAlign = useCallback((align: string) => {
    engine.block.setTextAlign(blockId, align);
    refresh();
  }, [engine, blockId, refresh]);

  // ── Shared handlers ──
  const handleOpacityChange = useCallback(([v]: number[]) => {
    engine.block.setOpacity(blockId, v);
    setOpacity(v);
  }, [engine, blockId]);

  const togglePanel = useCallback((panel: PropertySidePanel) => {
    setPropertySidePanel(propertySidePanel === panel ? null : panel);
  }, [propertySidePanel, setPropertySidePanel]);

  // Toolbar button helper
  const PanelButton: React.FC<{
    panel: PropertySidePanel;
    icon: React.ReactNode;
    label: string;
  }> = ({ panel, icon, label }) => (
    <button
      onClick={() => togglePanel(panel)}
      className={cn(
        'flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs transition-colors whitespace-nowrap',
        propertySidePanel === panel
          ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );

  const colorSwatch = isText ? (textState?.fill ?? '#000000') : fillColor;

  return (
    <div
      className={cn(
        'flex items-center gap-1 h-10 px-3',
        'bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg',
        'animate-in fade-in-0 slide-in-from-top-1 duration-150',
        'overflow-x-auto scrollbar-none',
      )}
    >
      {/* ── Text-specific controls ── */}
      {isText && textState && (
        <>
          {/* Font family */}
          <Select value={textState.fontFamily} onValueChange={handleFontFamily}>
            <SelectTrigger className="min-w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Bold / Italic */}
          <button
            onClick={handleBoldToggle}
            className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
              textState.fontWeight === 'bold'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleItalicToggle}
            className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
              textState.fontStyle === 'italic'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent',
            )}
          >
            <Italic className="h-3.5 w-3.5" />
          </button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Font size */}
          <input
            type="number"
            value={Math.round(textState.fontSize)}
            onChange={handleFontSize}
            min={1}
            max={500}
            className="w-12 h-7 rounded-md border border-border bg-background px-1.5 text-xs text-center tabular-nums"
          />
          <span className="text-xs text-muted-foreground">pt</span>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Alignment */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
                {textState.textAlign === 'center' ? (
                  <AlignCenter className="h-3.5 w-3.5" />
                ) : textState.textAlign === 'right' ? (
                  <AlignRight className="h-3.5 w-3.5" />
                ) : (
                  <AlignLeft className="h-3.5 w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto p-1" align="start">
              <div className="flex gap-0.5">
                {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(
                  ([align, Icon]) => (
                    <button
                      key={align}
                      onClick={() => handleTextAlign(align)}
                      className={cn(
                        'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
                        textState.textAlign === align
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ),
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* More text options */}
          <button
            onClick={() => togglePanel('color')}
            className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          <Separator orientation="vertical" className="h-5 mx-1" />
        </>
      )}

      {/* ── Shared property buttons ── */}

      {/* Color (text + graphic only) */}
      {!isImage && (
        <PanelButton
          panel="color"
          icon={
            <div
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: colorSwatch }}
            />
          }
          label="Color"
        />
      )}

      {/* No-fill toggle (graphic only) */}
      {!isText && !isImage && (
        <button
          onClick={() => {
            const enabled = engine.block.isFillEnabled(blockId);
            engine.block.setFillEnabled(blockId, !enabled);
            refresh();
          }}
          className={cn(
            'h-7 w-7 rounded-md flex items-center justify-center transition-colors',
            !engine.block.isFillEnabled(blockId)
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:bg-accent',
          )}
          title={engine.block.isFillEnabled(blockId) ? 'Disable fill' : 'Enable fill'}
        >
          <CircleOff className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Background (text only) */}
      {isText && (
        <PanelButton
          panel="background"
          icon={<Paintbrush className="h-3.5 w-3.5" />}
          label="Background"
        />
      )}

      {/* Stroke (graphic only) */}
      {!isText && !isImage && (
        <PanelButton
          panel="stroke"
          icon={<Paintbrush className="h-3.5 w-3.5" />}
          label="Stroke"
        />
      )}

      {/* Image fill panel button (image only) */}
      {isImage && (
        <PanelButton
          panel="imageFill"
          icon={<ImageIcon className="h-3.5 w-3.5" />}
          label="Image"
        />
      )}

      {/* Style dropdown (image only — Adjustments / Filters) */}
      {isImage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs transition-colors whitespace-nowrap',
                propertySidePanel === 'adjust' || propertySidePanel === 'filter'
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Style
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto p-1" align="center">
            <button
              onClick={() => togglePanel('adjust')}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors',
                propertySidePanel === 'adjust'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Adjustments
            </button>
            <button
              onClick={() => togglePanel('filter')}
              className={cn(
                'flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors',
                propertySidePanel === 'filter'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Palette className="h-4 w-4" />
              Filters
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Shadow */}
      <PanelButton
        panel="shadow"
        icon={<Sun className="h-3.5 w-3.5" />}
        label="Shadow"
      />

      {/* Opacity (dropdown) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              'flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs transition-colors whitespace-nowrap',
              'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Grid2x2 className="h-3.5 w-3.5" />
            Opacity
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 p-3" align="center" onCloseAutoFocus={(e) => e.preventDefault()}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Opacity</span>
              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[opacity]}
              onValueChange={handleOpacityChange}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Position */}
      <PanelButton
        panel="position"
        icon={<Move className="h-3.5 w-3.5" />}
        label="Position"
      />
    </div>
  );
};
