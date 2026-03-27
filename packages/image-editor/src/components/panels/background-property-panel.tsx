import type { EditxEngine } from "@editx/engine";
import { colorToHex, FILL_COLOR, FILL_SOLID_COLOR, hexToColor } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ColorPicker } from "../ui/color-picker";
import { SwitchField } from "../ui/switch-field";

interface BackgroundPropertyPanelProps {
  engine: EditxEngine;
  blockId: number;
}

function readFillState(engine: EditxEngine, blockId: number) {
  const fillEnabled = engine.block.isFillEnabled(blockId);
  let color = "#000000";
  const fillId = engine.block.getFill(blockId);
  if (fillId != null) {
    const c = engine.block.getColor(fillId, FILL_SOLID_COLOR);
    if (c) color = colorToHex(c).substring(0, 7);
  } else {
    // Text blocks don't have fill sub-blocks; read FILL_COLOR directly
    const c = engine.block.getColor(blockId, FILL_COLOR);
    if (c) color = colorToHex(c).substring(0, 7);
  }
  return { enabled: fillEnabled, color };
}

export const BackgroundPropertyPanel: React.FC<BackgroundPropertyPanelProps> = ({
  engine,
  blockId,
}) => {
  const [state, setState] = useState(() => readFillState(engine, blockId));

  useEffect(() => {
    setState(readFillState(engine, blockId));
  }, [engine, blockId]);

  // Re-sync when undo/redo changes engine state
  useEffect(() => {
    return engine.onHistoryChanged(() => setState(readFillState(engine, blockId)));
  }, [engine, blockId]);

  const refresh = useCallback(() => setState(readFillState(engine, blockId)), [engine, blockId]);

  const handleToggle = useCallback(() => {
    engine.block.setFillEnabled(blockId, !state.enabled);
    refresh();
  }, [engine, blockId, state.enabled, refresh]);

  const handleColorChange = useCallback(
    (newColor: string) => {
      const fillId = engine.block.getFill(blockId);
      if (fillId != null) {
        engine.block.setColor(fillId, FILL_SOLID_COLOR, hexToColor(newColor));
      } else {
        // Text blocks: set fill color directly on the block
        engine.block.setColor(blockId, FILL_COLOR, hexToColor(newColor));
      }
      if (!state.enabled) {
        engine.block.setFillEnabled(blockId, true);
      }
      refresh();
    },
    [engine, blockId, state.enabled, refresh],
  );

  return (
    <SwitchField label="Enable Background" checked={state.enabled} onChange={handleToggle}>
      <ColorPicker color={state.color} onChange={handleColorChange} showHexInput={false} />
    </SwitchField>
  );
};
