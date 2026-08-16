import type { EditxEngine, TextRunStyle } from "@editx/engine";
import { useCallback, useEffect, useState } from "react";
import { useConfig } from "../../config/config-context";
import type { PropertySidePanel } from "../../store/image-editor-store";
import { useImageEditorStore } from "../../store/image-editor-store";
import { enableStrokeWithDefaults } from "../../utils/enable-stroke";

interface UsePropertyPanelVisibilityOptions {
  engine: EditxEngine | null;
  panel: PropertySidePanel;
  blockId: number | null;
  blockType: string | null;
}

export interface PropertyPanelVisibility {
  enabled: boolean;
  onToggle: () => void;
}

function readTextShadowEnabled(
  engine: EditxEngine,
  blockId: number,
  selectionStart?: number,
): boolean {
  const runs = engine.block.getTextRuns(blockId);
  let style: TextRunStyle = runs[0]?.style ?? {};
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
  return Boolean(
    style.textShadowColor ||
      style.textShadowBlur ||
      style.textShadowOffsetX ||
      style.textShadowOffsetY,
  );
}

function readVisibility(
  engine: EditxEngine,
  panel: PropertySidePanel,
  blockId: number,
  blockType: string | null,
  selectionStart?: number,
): boolean | null {
  if (panel === "fill" && blockType === "graphic") {
    return engine.block.isFillEnabled(blockId);
  }
  if (panel === "stroke" && blockType === "graphic") {
    return engine.block.isStrokeEnabled(blockId);
  }
  if (panel === "shadow") {
    return blockType === "text"
      ? readTextShadowEnabled(engine, blockId, selectionStart)
      : engine.block.isShadowEnabled(blockId);
  }
  return null;
}

export function usePropertyPanelVisibility(
  options: UsePropertyPanelVisibilityOptions,
): PropertyPanelVisibility | undefined {
  const { engine, panel, blockId, blockType } = options;

  const shapes = useConfig().shapes;
  const textSelectionRange = useImageEditorStore((state) => state.textSelectionRange);
  const editingTextBlockId = useImageEditorStore((state) => state.editingTextBlockId);

  const [enabled, setEnabled] = useState<boolean | null>(() =>
    engine && blockId !== null
      ? readVisibility(engine, panel, blockId, blockType, textSelectionRange?.from)
      : null,
  );

  const refresh = useCallback(() => {
    setEnabled(
      engine && blockId !== null
        ? readVisibility(engine, panel, blockId, blockType, textSelectionRange?.from)
        : null,
    );
  }, [engine, panel, blockId, blockType, textSelectionRange?.from]);

  const onToggle = useCallback(() => {
    if (!engine || blockId === null || enabled === null) return;
    const nextEnabled = !enabled;

    if (panel === "fill") {
      engine.block.setFillEnabled(blockId, nextEnabled);
    } else if (panel === "stroke") {
      if (nextEnabled) {
        enableStrokeWithDefaults(engine, blockId, {
          color: shapes?.defaultStrokeColor,
          width: shapes?.defaultStrokeWidth,
        });
      } else {
        engine.block.setStrokeEnabled(blockId, false);
      }
    } else if (panel === "shadow" && blockType === "text") {
      const hasCharSelection =
        editingTextBlockId === blockId &&
        textSelectionRange !== null &&
        textSelectionRange.from !== textSelectionRange.to;
      const start = hasCharSelection ? textSelectionRange.from : 0;
      const end = hasCharSelection
        ? textSelectionRange.to
        : engine.block.getTextContent(blockId).length;
      engine.block.setTextShadow(
        blockId,
        start,
        end,
        nextEnabled
          ? { color: "#000000", blur: 4, offsetX: 2, offsetY: 2 }
          : { color: "", blur: 0, offsetX: 0, offsetY: 0 },
      );
    } else if (panel === "shadow") {
      engine.block.setShadowEnabled(blockId, nextEnabled);
    }

    setEnabled(nextEnabled);
  }, [
    engine,
    blockId,
    enabled,
    panel,
    blockType,
    shapes?.defaultStrokeColor,
    shapes?.defaultStrokeWidth,
    editingTextBlockId,
    textSelectionRange,
  ]);

  useEffect(refresh, [refresh]);

  useEffect(() => {
    if (!engine || enabled === null) return;
    return engine.onHistoryChanged(refresh);
  }, [engine, enabled, refresh]);

  return enabled === null ? undefined : { enabled, onToggle };
}
