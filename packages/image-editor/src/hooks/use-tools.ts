import type { CreativeEngine, ShapeType } from "@creative-editor/engine";
import { useCallback, useMemo } from "react";
import type { EditorEventCallbacks } from "../config/config.types";
import { useImageEditorStore } from "../store/image-editor-store";
import { useAdjustmentsTool } from "./use-adjustments-tool";
import { type UseBlockActionsReturn, useBlockActions } from "./use-block-actions";
import { useBlockEffects } from "./use-block-effects";
import { useCropTool } from "./use-crop-tool";
import { useFilterTool } from "./use-filter-tool";
import { useImageTool } from "./use-image-tool";
import { useNotifications } from "./use-notifications";
import { useRotateFlipTool } from "./use-rotate-flip-tool";
import { useShapesTool } from "./use-shapes-tool";
import { type TextPreset, useTextTool } from "./use-text-tool";
import { useToolManager } from "./use-tool-manager";

const SHAPE_NAMES: Record<string, string> = {
  rect: "Rectangle",
  ellipse: "Ellipse",
  polygon: "Polygon",
  star: "Star",
  line: "Arrow",
};

export interface UseToolsOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
  engine: CreativeEngine | null;
  selectedShapeId: number | null;
  setSelectedShapeId: (id: number | null) => void;
  events?: EditorEventCallbacks;
}

export function useTools({
  engineRef,
  engine,
  selectedShapeId,
  setSelectedShapeId,
  events,
}: UseToolsOptions) {
  const notify = useNotifications();

  // --- Individual tool hooks ---
  const crop = useCropTool({ engineRef });
  const rotateFlip = useRotateFlipTool({ engineRef });
  const adjustments = useAdjustmentsTool({ engineRef });
  const filter = useFilterTool({ engineRef });
  const shapes = useShapesTool({ engineRef });
  const textTool = useTextTool({ engineRef });
  const imageTool = useImageTool({ engineRef });
  const blockActions = useBlockActions({
    engineRef,
    selectedBlockId: selectedShapeId,
    onDeselect: () => setSelectedShapeId(null),
  });

  // --- Notification-wrapped callbacks ---
  const cropApply = useCallback(() => {
    crop.handleCropApply();
    notify.success("Image cropped");
  }, [crop, notify]);

  const addShape = useCallback(
    (shapeType: ShapeType, sides?: number) => {
      shapes.handleAddShape(shapeType, sides);
      notify.success(`${SHAPE_NAMES[shapeType] ?? "Shape"} added`);
    },
    [shapes, notify],
  );

  const addText = useCallback(
    (preset?: TextPreset) => {
      textTool.handleAddText(preset);
      notify.success("Text added");
    },
    [textTool, notify],
  );

  const addImage = useCallback(
    async (file: File) => {
      await imageTool.handleAddImage(file);
      notify.success("Image added");
    },
    [imageTool, notify],
  );

  const replaceImage = useCallback(
    async (file: File, blockId: number) => {
      await imageTool.handleReplaceImage(file, blockId);
      notify.success("Image replaced");
    },
    [imageTool, notify],
  );

  const duplicate = useCallback(() => {
    blockActions.duplicate();
    notify.success("Duplicated");
  }, [blockActions, notify]);

  const deleteBlock = useCallback(() => {
    blockActions.deleteBlock();
    notify.success("Deleted");
  }, [blockActions, notify]);

  const notifyingBlockActions: UseBlockActionsReturn = useMemo(
    () => ({ ...blockActions, duplicate, deleteBlock }),
    [blockActions, duplicate, deleteBlock],
  );

  // --- Block type & effects ---
  const selectedBlockType =
    engine && selectedShapeId !== null
      ? (engine.block.getType(selectedShapeId) as "text" | "graphic" | string)
      : null;

  const blockEffects = useBlockEffects({
    engineRef,
    blockId: selectedBlockType === "image" ? selectedShapeId : null,
  });

  // --- Tool manager (with notification-wrapped cropApply) ---
  const cropForManager = useMemo(
    () => ({
      enterCropMode: crop.enterCropMode,
      handleCropApply: cropApply,
      handleCropCancel: crop.handleCropCancel,
    }),
    [crop.enterCropMode, cropApply, crop.handleCropCancel],
  );

  const { activeTool, activeToolId, handleSidebarToolSelect, handleDone, handleContextualReset } =
    useToolManager({ engineRef, crop: cropForManager, rotateFlip, adjustments, filter, events });

  // --- Active tool state for store reads ---
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);

  return {
    // Raw tool hooks (for SidePanel / CanvasPane to read specific methods)
    crop,
    rotateFlip,
    adjustments,
    filter,
    blockActions: notifyingBlockActions,
    blockEffects,
    selectedBlockType,
    notify,

    // Notification-wrapped callbacks
    addShape,
    addText,
    addImage,
    replaceImage,
    duplicate,
    deleteBlock,

    // Tool manager
    activeTool,
    activeToolId,
    handleSidebarToolSelect,
    handleDone,
    handleContextualReset,
    setActiveTool,
  };
}
