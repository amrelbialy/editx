import type { EditxEngine } from "@editx/engine";
import { colorToHex, FILL_SOLID_COLOR, TEXT_ALIGN } from "@editx/engine";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  CircleOff,
  Grid2x2,
  ImageIcon,
  Italic,
  MoreHorizontal,
  Move,
  Paintbrush,
  Palette,
  RemoveFormatting,
  SlidersHorizontal,
  Sparkles,
  Strikethrough,
  Sun,
  TextCursorInput,
  Underline,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import type { PropertySidePanel } from "../../store/image-editor-store";
import { useImageEditorStore } from "../../store/image-editor-store";
import { cn } from "../../utils/cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";

interface BlockPropertiesBarProps {
  engine: EditxEngine;
  blockId: number;
  blockType: "text" | "graphic" | "image";
}

const FONT_FAMILIES = [
  "Inter",
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
];

// â”€â”€ State readers â”€â”€

function readTextState(engine: EditxEngine, blockId: number, selectionStart?: number) {
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
    fontFamily: targetStyle.fontFamily ?? "Arial",
    fontWeight: targetStyle.fontWeight ?? "normal",
    fontStyle: targetStyle.fontStyle ?? "normal",
    fill: targetStyle.fill ?? "#000000",
    textDecoration: targetStyle.textDecoration ?? "",
    textAlign: align || "left",
    opacity: engine.block.getOpacity(blockId),
  };
}

function readBlockColor(engine: EditxEngine, blockId: number): string {
  const fillId = engine.block.getFill(blockId);
  if (fillId != null) {
    const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
    if (c) return colorToHex(c).substring(0, 7);
  }
  return "#4a90e2";
}

// â”€â”€ Main Component â”€â”€

export const BlockPropertiesBar: React.FC<BlockPropertiesBarProps> = ({
  engine,
  blockId,
  blockType,
}) => {
  const propertySidePanel = useImageEditorStore((s) => s.propertySidePanel);
  const setPropertySidePanel = useImageEditorStore((s) => s.setPropertySidePanel);
  const textSelectionRange = useImageEditorStore((s) => s.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);

  const isText = blockType === "text";
  const isImage = blockType === "image";
  const { t } = useTranslation();

  // State
  const [textState, setTextState] = useState(() =>
    isText ? readTextState(engine, blockId, textSelectionRange?.from) : null,
  );

  const [fillColor, setFillColor] = useState(() =>
    !isText && !isImage ? readBlockColor(engine, blockId) : "#000000",
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

  // â”€â”€ Selection-aware style range â”€â”€
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

  // â”€â”€ Text handlers â”€â”€
  const handleFontFamily = useCallback(
    (value: string) => {
      const { start, end } = getStyleRange();
      engine.block.setTextFontFamily(blockId, start, end, value);
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

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

  const handleFontSize = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (!Number.isNaN(val) && val > 0) {
        const { start, end } = getStyleRange();
        engine.block.setTextFontSize(blockId, start, end, val);
        refresh();
      }
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleFontSizePreset = useCallback(
    (size: number) => {
      const { start, end } = getStyleRange();
      engine.block.setTextFontSize(blockId, start, end, size);
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleTextAlign = useCallback(
    (align: string) => {
      engine.block.setTextAlign(blockId, align);
      refresh();
    },
    [engine, blockId, refresh],
  );

  const _handleTextColor = useCallback(
    (color: string) => {
      const { start, end } = getStyleRange();
      engine.block.setTextColor(blockId, start, end, color);
      refresh();
    },
    [engine, blockId, getStyleRange, refresh],
  );

  const handleUnderlineToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    const runs = engine.block.getTextRuns(blockId);
    let currentDeco = "";
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > (textSelectionRange?.from ?? 0)) {
        currentDeco = run.style.textDecoration ?? "";
        break;
      }
      offset += run.text.length;
    }
    const hasUnderline = currentDeco.includes("underline");
    const parts = currentDeco.split(" ").filter((d) => d && d !== "underline");
    if (!hasUnderline) parts.push("underline");
    engine.block.setTextStyle(blockId, start, end, {
      textDecoration: parts.join(" ") || undefined,
    });
    refresh();
  }, [engine, blockId, getStyleRange, textSelectionRange, refresh]);

  const handleStrikethroughToggle = useCallback(() => {
    const { start, end } = getStyleRange();
    const runs = engine.block.getTextRuns(blockId);
    let currentDeco = "";
    let offset = 0;
    for (const run of runs) {
      if (offset + run.text.length > (textSelectionRange?.from ?? 0)) {
        currentDeco = run.style.textDecoration ?? "";
        break;
      }
      offset += run.text.length;
    }
    const hasStrikethrough = currentDeco.includes("line-through");
    const parts = currentDeco.split(" ").filter((d) => d && d !== "line-through");
    if (!hasStrikethrough) parts.push("line-through");
    engine.block.setTextStyle(blockId, start, end, {
      textDecoration: parts.join(" ") || undefined,
    });
    refresh();
  }, [engine, blockId, getStyleRange, textSelectionRange, refresh]);

  const handleClearFormatting = useCallback(() => {
    const { start, end } = getStyleRange();
    engine.block.setTextStyle(blockId, start, end, {
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: undefined,
      backgroundColor: undefined,
      textTransform: "none",
      textShadowColor: undefined,
      textShadowBlur: undefined,
      textShadowOffsetX: undefined,
      textShadowOffsetY: undefined,
      textStrokeColor: undefined,
      textStrokeWidth: undefined,
    });
    refresh();
  }, [engine, blockId, getStyleRange, refresh]);

  // â”€â”€ Shared handlers â”€â”€
  const handleOpacityChange = useCallback(
    ([v]: number[]) => {
      engine.block.setOpacity(blockId, v);
      setOpacity(v);
    },
    [engine, blockId],
  );

  const togglePanel = useCallback(
    (panel: PropertySidePanel) => {
      setPropertySidePanel(propertySidePanel === panel ? null : panel);
    },
    [propertySidePanel, setPropertySidePanel],
  );

  // Toolbar button helper
  const PanelButton: React.FC<{
    panel: PropertySidePanel;
    icon: React.ReactNode;
    label: string;
  }> = ({ panel, icon, label }) => (
    <button
      type="button"
      onClick={() => togglePanel(panel)}
      className={cn(
        "flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs transition-colors whitespace-nowrap",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        propertySidePanel === panel
          ? "bg-primary/20 text-primary ring-1 ring-primary/30"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );

  const colorSwatch = isText ? (textState?.fill ?? "#000000") : fillColor;

  return (
    <div
      className={cn(
        "flex items-center gap-1 h-10 px-3",
        "bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-lg",
        "animate-in fade-in-0 slide-in-from-top-1 duration-150",
        "overflow-x-auto scrollbar-none",
      )}
      data-text-toolbar
    >
      {/* â”€â”€ Text-specific controls â”€â”€ */}
      {isText && textState && (
        <>
          {/* Font family */}
          <Select value={textState.fontFamily} onValueChange={handleFontFamily}>
            <SelectTrigger className="min-w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Bold / Italic */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleBoldToggle}
            aria-label={t("block.bold")}
            aria-pressed={textState.fontWeight === "bold"}
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              textState.fontWeight === "bold"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleItalicToggle}
            aria-label={t("block.italic")}
            aria-pressed={textState.fontStyle === "italic"}
            className={cn(
              "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              textState.fontStyle === "italic"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Italic className="h-4 w-4" />
          </button>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Font size with preset dropdown */}
          <DropdownMenu>
            <div className="flex items-center">
              <input
                type="number"
                value={Math.round(textState.fontSize)}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={handleFontSize}
                min={1}
                max={500}
                className="w-12 h-7 rounded-l-md border border-border bg-background px-1.5 text-xs text-center tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                data-text-toolbar
              />
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-0.5 rounded-r-md border border-l-0 border-border bg-background text-muted-foreground hover:bg-accent transition-colors flex items-center focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                  data-text-toolbar
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent
              className="w-auto p-1 min-w-[60px]"
              align="start"
              data-text-toolbar
            >
              <div className="flex flex-col gap-0.5">
                {[14, 16, 18, 21, 24, 28, 32, 36, 48, 54].map((size) => (
                  <button
                    type="button"
                    key={size}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleFontSizePreset(size)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs tabular-nums text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      Math.round(textState.fontSize) === size
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-xs text-muted-foreground">pt</span>

          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Alignment */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                aria-label={t("block.textAlignment")}
              >
                {textState.textAlign === "center" ? (
                  <AlignCenter className="h-4 w-4" />
                ) : textState.textAlign === "right" ? (
                  <AlignRight className="h-4 w-4" />
                ) : (
                  <AlignLeft className="h-4 w-4" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto p-1" align="start" data-text-toolbar>
              <div className="flex gap-0.5">
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                  ] as const
                ).map(([align, Icon]) => (
                  <button
                    type="button"
                    key={align}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleTextAlign(align)}
                    className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      textState.textAlign === align
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Advanced text properties (â‰¡A) */}
          <PanelButton
            panel="text-advanced"
            icon={<TextCursorInput className="h-4 w-4" />}
            label=""
          />

          {/* More text options (...) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                aria-label={t("block.moreTextOptions")}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-auto p-1" align="start" data-text-toolbar>
              <div className="flex flex-col gap-0.5 min-w-[160px]">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleUnderlineToggle}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    textState.textDecoration.includes("underline")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Underline className="h-4 w-4" />
                  {t("block.underline")}
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleStrikethroughToggle}
                  className={cn(
                    "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    textState.textDecoration.includes("line-through")
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Strikethrough className="h-4 w-4" />
                  {t("block.strikethrough")}
                </button>
                <div className="h-px bg-border my-0.5" />
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={handleClearFormatting}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                >
                  <RemoveFormatting className="h-4 w-4" />
                  {t("block.clearFormatting")}
                </button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-5 mx-1" />
        </>
      )}

      {/* â”€â”€ Shared property buttons â”€â”€ */}

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
          label={t("block.color")}
        />
      )}

      {/* No-fill toggle (graphic only) */}
      {!isText && !isImage && (
        <button
          type="button"
          onClick={() => {
            const enabled = engine.block.isFillEnabled(blockId);
            engine.block.setFillEnabled(blockId, !enabled);
            refresh();
          }}
          aria-label={
            engine.block.isFillEnabled(blockId) ? t("block.disableFill") : t("block.enableFill")
          }
          aria-pressed={!engine.block.isFillEnabled(blockId)}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            !engine.block.isFillEnabled(blockId)
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:bg-accent",
          )}
          title={
            engine.block.isFillEnabled(blockId) ? t("block.disableFill") : t("block.enableFill")
          }
        >
          <CircleOff className="h-4 w-4" />
        </button>
      )}

      {/* Background (text only) */}
      {isText && (
        <PanelButton
          panel="background"
          icon={<Paintbrush className="h-4 w-4" />}
          label={t("block.background")}
        />
      )}

      {/* Stroke (graphic only) */}
      {!isText && !isImage && (
        <PanelButton
          panel="stroke"
          icon={<Paintbrush className="h-4 w-4" />}
          label={t("block.stroke")}
        />
      )}

      {/* Image fill panel button (image only) */}
      {isImage && (
        <PanelButton
          panel="imageFill"
          icon={<ImageIcon className="h-4 w-4" />}
          label={t("block.image")}
        />
      )}

      {/* Style dropdown (image only â€” Adjustments / Filters) */}
      {isImage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs transition-colors whitespace-nowrap",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                propertySidePanel === "adjust" || propertySidePanel === "filter"
                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Sparkles className="h-4 w-4" />
              {t("block.style")}
              <ChevronDown className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto p-1" align="center">
            <button
              type="button"
              onClick={() => togglePanel("adjust")}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                propertySidePanel === "adjust"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {t("panel.adjustments")}
            </button>
            <button
              type="button"
              onClick={() => togglePanel("filter")}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                propertySidePanel === "filter"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Palette className="h-4 w-4" />
              {t("panel.filters")}
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Shadow */}
      <PanelButton panel="shadow" icon={<Sun className="h-4 w-4" />} label={t("block.shadow")} />

      {/* Opacity (dropdown) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs transition-colors whitespace-nowrap",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Grid2x2 className="h-4 w-4" />
            {t("block.opacity")}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 p-3"
          align="center"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{t("block.opacity")}</span>
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
        icon={<Move className="h-4 w-4" />}
        label={t("block.position")}
      />
    </div>
  );
};
