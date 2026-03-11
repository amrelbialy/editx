import { useCallback } from 'react';
import type { CreativeEngine } from '@creative-editor/engine';
import { useImageEditorStore, type ImageEditorTool } from '../store/image-editor-store';
import type { ImageEditorToolId, EditorEventCallbacks } from '../config/config.types';

export interface UseToolManagerOptions {
  engineRef: React.RefObject<CreativeEngine | null>;
  enterCropMode: () => void;
  handleCropApply: () => void;
  handleCropCancel: () => void;
  handleRotateReset: () => void;
  handleAdjustReset: () => void;
  syncRotationState: () => void;
  ensureAdjustEffect: () => number | null;
  syncAdjustValues: () => void;
  ensureFilterEffect: () => number | null;
  syncFilterState: () => void;
  events?: EditorEventCallbacks;
}

export function useToolManager({
  engineRef,
  enterCropMode,
  handleCropApply,
  handleCropCancel,
  handleRotateReset,
  handleAdjustReset,
  syncRotationState,
  ensureAdjustEffect,
  syncAdjustValues,
  ensureFilterEffect,
  syncFilterState,
  events,
}: UseToolManagerOptions) {
  const activeTool = useImageEditorStore((s) => s.activeTool);
  const setActiveTool = useImageEditorStore((s) => s.setActiveTool);

  const activeToolId: ImageEditorToolId | null =
    activeTool === 'select' || activeTool === 'rotate' || activeTool === 'resize' || activeTool === 'pen'
      ? null
      : (activeTool as ImageEditorToolId);

  const handleToolChange = useCallback((tool: ImageEditorTool) => {
    if (tool === 'crop') {
      enterCropMode();
    } else {
      if (activeTool === 'crop') {
        const ce = engineRef.current;
        if (ce) {
          ce.editor.setEditMode('Transform');
          ce.editor.fitToScreen();
        }
      }
      setActiveTool(tool);

      if (tool === 'rotate') syncRotationState();
      if (tool === 'adjust') { ensureAdjustEffect(); syncAdjustValues(); }
      if (tool === 'filter') { ensureFilterEffect(); syncFilterState(); }
    }
    events?.onToolChange?.(tool === 'select' ? null : tool);
  }, [activeTool, engineRef, enterCropMode, setActiveTool, syncRotationState, ensureAdjustEffect, syncAdjustValues, ensureFilterEffect, syncFilterState, events]);

  const handleSidebarToolSelect = useCallback((toolId: ImageEditorToolId) => {
    if (activeToolId === toolId) {
      const ce = engineRef.current;
      if (activeTool === 'crop' && ce) {
        ce.editor.setEditMode('Transform');
        ce.editor.fitToScreen();
      }
      setActiveTool('select');
      return;
    }
    handleToolChange(toolId as ImageEditorTool);
  }, [activeToolId, activeTool, engineRef, handleToolChange, setActiveTool]);

  const handleDone = useCallback(() => {
    if (activeTool === 'crop') {
      handleCropApply();
    } else {
      setActiveTool('select');
    }
  }, [activeTool, handleCropApply, setActiveTool]);

  const handleContextualReset = useCallback(() => {
    if (activeTool === 'crop') handleCropCancel();
    else if (activeTool === 'rotate') handleRotateReset();
    else if (activeTool === 'adjust') handleAdjustReset();
  }, [activeTool, handleCropCancel, handleRotateReset, handleAdjustReset]);

  return {
    activeTool,
    activeToolId,
    handleToolChange,
    handleSidebarToolSelect,
    handleDone,
    handleContextualReset,
  };
}
