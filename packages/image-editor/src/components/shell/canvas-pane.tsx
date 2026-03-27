import type { EditxEngine } from "@editx/engine";
import React, { useCallback, useEffect } from "react";
import type { EditorSlots } from "../../config/config.types";
import type { UseBlockActionsReturn } from "../../hooks/use-block-actions";
import { useBlockScreenRect } from "../../hooks/use-block-screen-rect";
import { useImageEditorStore } from "../../store/image-editor-store";
import { TextEditorOverlay } from "../text-editor-overlay";
import { BlockPropertiesBar } from "./block-properties-bar";
import { CanvasArea } from "./canvas-area";
import { CanvasBlockOverlay } from "./canvas-block-overlay";
import { ToolPropertiesBar } from "./tool-properties-bar";

interface CanvasPaneProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  engine: EditxEngine | null;
  activeTool: string;
  selectedShapeId: number | null;
  selectedBlockType: string | null;
  hasSelectedBlock: boolean;
  blockActions: UseBlockActionsReturn;
  rotateFlip: {
    handleRotateClockwise: () => void;
    handleRotateCounterClockwise: () => void;
    handleFlipHorizontal: () => void;
    handleFlipVertical: () => void;
  };
  replaceImage: (file: File, blockId: number) => Promise<void>;
  activeCustomToolBar?: React.ComponentType;
  slots?: EditorSlots;
  onContextualReset: () => void;
  onDone: () => void;
}

export const CanvasPane: React.FC<CanvasPaneProps> = (props) => {
  const {
    canvasRef,
    engine,
    activeTool,
    selectedShapeId,
    selectedBlockType,
    hasSelectedBlock,
    blockActions,
    rotateFlip,
    replaceImage,
    activeCustomToolBar,
    slots,
    onContextualReset,
    onDone,
  } = props;

  const blockScreenRect = useBlockScreenRect(engine ?? null, selectedShapeId);

  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);
  const setEditingTextBlockId = useImageEditorStore((s) => s.setEditingTextBlockId);
  const setTextSelectionRange = useImageEditorStore((s) => s.setTextSelectionRange);

  // Subscribe to dblclick on text blocks to enter inline editing
  useEffect(() => {
    if (!engine) return;
    return engine.block.onBlockDoubleClick((blockId: number) => {
      if (engine.block.getType(blockId) === "text") {
        setEditingTextBlockId(blockId);
      }
    });
  }, [engine, setEditingTextBlockId]);

  const handleCloseTextEditor = useCallback(() => {
    setEditingTextBlockId(null);
    setTextSelectionRange(null);
  }, [setEditingTextBlockId, setTextSelectionRange]);

  const header =
    engine && selectedShapeId !== null && hasSelectedBlock ? (
      <BlockPropertiesBar
        engine={engine}
        blockId={selectedShapeId}
        blockType={selectedBlockType as "text" | "graphic" | "image"}
      />
    ) : activeTool !== "select" ? (
      <ToolPropertiesBar
        activeTool={activeTool}
        onReset={onContextualReset}
        onDone={onDone}
        onRotateClockwise={rotateFlip.handleRotateClockwise}
        onRotateCounterClockwise={rotateFlip.handleRotateCounterClockwise}
        onFlipHorizontal={rotateFlip.handleFlipHorizontal}
        onFlipVertical={rotateFlip.handleFlipVertical}
        customContent={
          activeCustomToolBar ? React.createElement(activeCustomToolBar) : slots?.contextualBarExtra
        }
      />
    ) : undefined;

  const overlay =
    engine && selectedShapeId !== null && hasSelectedBlock && blockScreenRect ? (
      <CanvasBlockOverlay
        blockType={selectedBlockType!}
        screenRect={blockScreenRect}
        isEditingText={editingTextBlockId !== null}
        onEditText={() => setEditingTextBlockId(selectedShapeId)}
        onReplaceImage={(file: File) => replaceImage(file, selectedShapeId)}
        blockActions={blockActions}
      />
    ) : undefined;

  return (
    <CanvasArea canvasRef={canvasRef} header={header} overlay={overlay}>
      {engine && editingTextBlockId !== null && (
        <TextEditorOverlay
          engine={engine}
          blockId={editingTextBlockId}
          canvasRef={canvasRef}
          onClose={handleCloseTextEditor}
        />
      )}
    </CanvasArea>
  );
};
