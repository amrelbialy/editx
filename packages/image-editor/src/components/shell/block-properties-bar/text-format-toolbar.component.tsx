import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Italic,
  TextCursorInput,
} from "lucide-react";
import type React from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui";
import { PanelButton } from "./panel-button.component";
import type { TextState } from "./state-readers";
import { TextMoreOptions } from "./text-more-options.component";

const FONT_SIZE_PRESETS = [14, 16, 18, 21, 24, 28, 32, 36, 48, 54];

const ALIGN_OPTIONS = [
  ["left", AlignLeft, "action.alignLeft"],
  ["center", AlignCenter, "action.alignCenter"],
  ["right", AlignRight, "action.alignRight"],
] as const;

export interface TextFormatToolbarProps {
  textState: TextState;
  fontFamilies: readonly string[];
  propertySidePanel: PropertySidePanel;
  onTogglePanel: (panel: PropertySidePanel) => void;
  onFontFamily: (value: string) => void;
  onBoldToggle: () => void;
  onItalicToggle: () => void;
  onFontSize: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFontSizePreset: (size: number) => void;
  onTextAlign: (align: string) => void;
  onUnderlineToggle: () => void;
  onStrikethroughToggle: () => void;
  onClearFormatting: () => void;
}

/**
 * Presentational text-formatting controls shown for text blocks. All mutations
 * are delegated to the handlers passed in via props.
 */
export const TextFormatToolbar: React.FC<TextFormatToolbarProps> = (props) => {
  const {
    textState,
    fontFamilies,
    propertySidePanel,
    onTogglePanel,
    onFontFamily,
    onBoldToggle,
    onItalicToggle,
    onFontSize,
    onFontSizePreset,
    onTextAlign,
    onUnderlineToggle,
    onStrikethroughToggle,
    onClearFormatting,
  } = props;

  const { t } = useTranslation();

  const AlignIcon =
    textState.textAlign === "center"
      ? AlignCenter
      : textState.textAlign === "right"
        ? AlignRight
        : AlignLeft;

  return (
    <>
      {/* Font family */}
      <Select value={textState.fontFamily} onValueChange={onFontFamily}>
        <SelectTrigger className="w-[110px]">
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

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Bold / Italic */}
      <IconButton
        onMouseDown={(e) => e.preventDefault()}
        onClick={onBoldToggle}
        label={t("block.bold")}
        aria-pressed={textState.fontWeight === "bold"}
        variant={textState.fontWeight === "bold" ? "default" : "ghost"}
        className={textState.fontWeight === "bold" ? undefined : "text-muted-foreground"}
        icon={<Bold className="h-4 w-4" />}
      />
      <IconButton
        onMouseDown={(e) => e.preventDefault()}
        onClick={onItalicToggle}
        label={t("block.italic")}
        aria-pressed={textState.fontStyle === "italic"}
        variant={textState.fontStyle === "italic" ? "default" : "ghost"}
        className={textState.fontStyle === "italic" ? undefined : "text-muted-foreground"}
        icon={<Italic className="h-4 w-4" />}
      />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Font size with preset dropdown */}
      <DropdownMenu>
        <div className="flex shrink-0 items-center">
          <Input
            type="number"
            value={textState.fontSize}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={onFontSize}
            min={1}
            max={500}
            fieldClassName="rounded-r-none w-12 text-center"
            data-text-toolbar
          />
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 rounded-l-none border border-l-0 border-border bg-muted text-muted-foreground"
              data-text-toolbar
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
        </div>
        <DropdownMenuContent className="w-auto p-1 min-w-[60px]" align="start" data-text-toolbar>
          <div className="flex flex-col gap-0.5">
            {FONT_SIZE_PRESETS.map((size) => (
              <Button
                key={size}
                variant="ghost"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onFontSizePreset(size)}
                className={cn(
                  "justify-start tabular-nums",
                  Math.round(textState.fontSize) === size
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {size}
              </Button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      <span className="text-xs text-muted-foreground">pt</span>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Alignment */}
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label={t("block.textAlignment")}
              >
                <AlignIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("block.textAlignment")}</TooltipContent>
        </Tooltip>
        <DropdownMenuContent className="w-auto p-1" align="start" data-text-toolbar>
          <div className="flex gap-0.5">
            {ALIGN_OPTIONS.map(([align, Icon, labelKey]) => (
              <IconButton
                key={align}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onTextAlign(align)}
                label={t(labelKey)}
                variant={textState.textAlign === align ? "default" : "ghost"}
                className={textState.textAlign === align ? undefined : "text-muted-foreground"}
                icon={<Icon className="h-4 w-4" />}
              />
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Advanced text properties (≡A) */}
      <PanelButton
        panel="text-advanced"
        icon={<TextCursorInput className="h-4 w-4" />}
        label=""
        tooltip={t("panel.advanced")}
        active={propertySidePanel === "text-advanced"}
        onToggle={onTogglePanel}
      />

      {/* More text options (...) */}
      <TextMoreOptions
        textDecoration={textState.textDecoration}
        onUnderlineToggle={onUnderlineToggle}
        onStrikethroughToggle={onStrikethroughToggle}
        onClearFormatting={onClearFormatting}
      />

      <Separator orientation="vertical" className="h-5 mx-1" />
    </>
  );
};
