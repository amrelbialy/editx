import type { EditxEngine } from "@editx/engine";
import type React from "react";
import { useCallback } from "react";
import { useConfig } from "../../../config/config-context";
import { DEFAULT_FONT_FAMILIES } from "../../../config/default-config";
import type { PropertySidePanel } from "../../../store/image-editor-store";
import { useImageEditorStore } from "../../../store/image-editor-store";
import { cn } from "../../../utils/cn";
import { textGradientToCss } from "../../../utils/text-gradient-css";
import { BlockPropertyButtons } from "./block-property-buttons.component";
import { GroupControls } from "./group-controls.component";
import { TextFormatToolbar } from "./text-format-toolbar.component";
import { useBlockPropertiesState } from "./use-block-properties-state";
import { useBlockTextFormat } from "./use-block-text-format";

interface BlockPropertiesBarProps {
  engine: EditxEngine;
  blockId: number;
  blockType: "text" | "graphic" | "image";
}

export const BlockPropertiesBar: React.FC<BlockPropertiesBarProps> = (props) => {
  const { engine, blockId, blockType } = props;

  const propertySidePanel = useImageEditorStore((s) => s.propertySidePanel);
  const setPropertySidePanel = useImageEditorStore((s) => s.setPropertySidePanel);

  const isText = blockType === "text";
  const isImage = blockType === "image";
  const config = useConfig();
  const fontFamilies = config.text?.fonts ?? DEFAULT_FONT_FAMILIES;

  const {
    textState,
    fillColor,
    opacity,
    refresh,
    getStyleRange,
    handleOpacityChange,
    textSelectionRange,
  } = useBlockPropertiesState({ engine, blockId, isText, isImage });

  const textFormat = useBlockTextFormat({
    engine,
    blockId,
    getStyleRange,
    refresh,
    textSelectionRange,
  });

  const togglePanel = useCallback(
    (panel: PropertySidePanel) => {
      setPropertySidePanel(propertySidePanel === panel ? null : panel);
    },
    [propertySidePanel, setPropertySidePanel],
  );

  const textSwatch = textState?.fillGradient
    ? textGradientToCss(textState.fillGradient)
    : (textState?.fill ?? "#000000");
  const colorSwatch = isText ? textSwatch : fillColor;

  return (
    <div
      className={cn(
        "flex items-center gap-1 h-10 px-3 [&>*]:shrink-0",
        "bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-lg",
        "animate-in fade-in-0 slide-in-from-top-1 duration-150",
        "overflow-x-auto scrollbar-none",
      )}
      data-text-toolbar
    >
      {isText && textState && (
        <TextFormatToolbar
          textState={textState}
          fontFamilies={fontFamilies}
          propertySidePanel={propertySidePanel}
          onTogglePanel={togglePanel}
          onFontFamily={textFormat.handleFontFamily}
          onBoldToggle={textFormat.handleBoldToggle}
          onItalicToggle={textFormat.handleItalicToggle}
          onFontSize={textFormat.handleFontSize}
          onFontSizePreset={textFormat.handleFontSizePreset}
          onTextAlign={textFormat.handleTextAlign}
          onUnderlineToggle={textFormat.handleUnderlineToggle}
          onStrikethroughToggle={textFormat.handleStrikethroughToggle}
          onClearFormatting={textFormat.handleClearFormatting}
        />
      )}

      <BlockPropertyButtons
        engine={engine}
        blockId={blockId}
        isText={isText}
        isImage={isImage}
        colorSwatch={colorSwatch}
        opacity={opacity}
        propertySidePanel={propertySidePanel}
        onTogglePanel={togglePanel}
        onOpacityChange={handleOpacityChange}
        refresh={refresh}
      />

      <GroupControls engine={engine} blockId={blockId} />
    </div>
  );
};
