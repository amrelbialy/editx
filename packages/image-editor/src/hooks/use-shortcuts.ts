import { useEffect } from 'react';
import type { ImageEditorToolId } from '../config/config.types';

export interface ShortcutActions {
  onToolSelect?: (tool: ImageEditorToolId) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onEscape?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomFit?: () => void;
  onDuplicate?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  enabled?: boolean;
}

const TOOL_KEYS: Record<string, ImageEditorToolId> = {
  c: 'crop',
  a: 'adjust',
  f: 'filter',
  t: 'text',
  s: 'shapes',
  i: 'image',
};

export function useShortcuts(actions: ShortcutActions) {
  const { enabled = true } = actions;

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in input fields
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement)?.isContentEditable) return;

      // Ctrl/Cmd + Z = Undo, Ctrl/Cmd + Shift + Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          actions.onRedo?.();
        } else {
          actions.onUndo?.();
        }
        return;
      }

      // Ctrl/Cmd + Y = Redo (Windows)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        actions.onRedo?.();
        return;
      }

      // Ctrl/Cmd + D = Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        actions.onDuplicate?.();
        return;
      }

      // Ctrl/Cmd + ] = Bring Forward, Ctrl/Cmd + Shift + ] = Bring to Front
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault();
        if (e.shiftKey) {
          actions.onBringToFront?.();
        } else {
          actions.onBringForward?.();
        }
        return;
      }

      // Ctrl/Cmd + [ = Send Backward, Ctrl/Cmd + Shift + [ = Send to Back
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault();
        if (e.shiftKey) {
          actions.onSendToBack?.();
        } else {
          actions.onSendBackward?.();
        }
        return;
      }

      // Don't handle single-key shortcuts when Ctrl/Meta is held
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Escape
      if (e.key === 'Escape') {
        actions.onEscape?.();
        return;
      }

      // Delete/Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        actions.onDelete?.();
        return;
      }

      // Zoom: +/= to zoom in, - to zoom out, 0 to fit
      if (e.key === '+' || e.key === '=') {
        actions.onZoomIn?.();
        return;
      }
      if (e.key === '-') {
        actions.onZoomOut?.();
        return;
      }
      if (e.key === '0') {
        actions.onZoomFit?.();
        return;
      }

      // Tool shortcuts (single letter)
      const toolId = TOOL_KEYS[e.key.toLowerCase()];
      if (toolId) {
        actions.onToolSelect?.(toolId);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions, enabled]);
}
