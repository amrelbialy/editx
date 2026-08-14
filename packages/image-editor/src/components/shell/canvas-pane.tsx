import type { EditxEngine } from "@editx/engine";
import React, { useCallback, useEffect, useRef } from "react";
import type { EditorSlots } from "../../config/config.types";
import { useConfig } from "../../config/config-context";
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
  const config = useConfig();

  const editingTextBlockId = useImageEditorStore((s) => s.editingTextBlockId);
  const editingTextClickPos = useImageEditorStore((s) => s.editingTextClickPos);
  const setEditingTextBlockId = useImageEditorStore((s) => s.setEditingTextBlockId);
  const setTextSelectionRange = useImageEditorStore((s) => s.setTextSelectionRange);

  const editingRef = useRef(editingTextBlockId);
  editingRef.current = editingTextBlockId;

  // Subscribe to dblclick on text blocks to enter inline editing.
  // Gate on group context: only open the editor when the resolved text block is
  // a DIRECT CHILD of the active group context. An ungrouped text block (top
  // level, no group parent) still opens on the FIRST dblclick.
  useEffect(() => {
    if (!engine) return;
    return engine.block.onBlockDoubleClick((blockId: number, screenPos) => {
      if (engine.block.getType(blockId) !== "text") return;

      const stack = engine.block.getGroupContext();
      const parent = engine.block.getParent(blockId);

      if (stack.length === 0) {
        // Top level: open only when the block is not nested in a group.
        if (parent == null || engine.block.getType(parent) !== "group") {
          setEditingTextBlockId(blockId, screenPos);
        }
        return;
      }

      // Inside a group: open only for direct children of the active context.
      if (parent === stack[stack.length - 1]) {
        setEditingTextBlockId(blockId, screenPos);
      }
    });
  }, [engine, setEditingTextBlockId]);

  // When clicking stage while editing text, close editor but keep block selected
  useEffect(() => {
    if (!engine) return;
    const handler = () => {
      const blockId = editingRef.current;
      if (blockId !== null) {
        engine.block.select(blockId);
        setEditingTextBlockId(null);
        setTextSelectionRange(null);
      }
    };
    engine.on("stage:click", handler);
    return () => engine.off("stage:click", handler);
  }, [engine, setEditingTextBlockId, setTextSelectionRange]);

  const handleCloseTextEditor = useCallback(() => {
    setEditingTextBlockId(null);
    setTextSelectionRange(null);
  }, [setEditingTextBlockId, setTextSelectionRange]);

  const header =
    engine && selectedShapeId !== null && hasSelectedBlock ? (
      <BlockPropertiesBar
        engine={engine}
        blockId={selectedShapeId}
        blockType={selectedBlockType as "text" | "graphic" | "image" | "group"}
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
        showRotateFlip={activeTool === "crop" ? config.crop?.showRotateFlip !== false : true}
        customContent={
          activeCustomToolBar ? React.createElement(activeCustomToolBar) : slots?.contextualBarExtra
        }
      />
    ) : undefined;

  const supportsOverlay =
    selectedBlockType === "text" ||
    selectedBlockType === "graphic" ||
    selectedBlockType === "image" ||
    selectedBlockType === "group";
  const overlay =
    engine && selectedShapeId !== null && hasSelectedBlock && supportsOverlay && blockScreenRect ? (
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
          clickScreenPos={editingTextClickPos}
          onClose={handleCloseTextEditor}
        />
      )}
    </CanvasArea>
  );
};
