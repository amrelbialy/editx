import React, { useCallback, useEffect, useRef } from 'react';
import { type CreativeEngine, TEXT_RUNS, VISIBLE } from '@creative-editor/engine';
import { runsToHtml, htmlToRuns, getSelectionRange, setSelectionRange } from '../utils/text-dom-utils';
import { useImageEditorStore } from '../store/image-editor-store';

export interface TextEditorOverlayProps {
  engine: CreativeEngine;
  blockId: number;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
}

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  engine,
  blockId,
  canvasRef,
  onClose,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const setTextSelectionRange = useImageEditorStore((s) => s.setTextSelectionRange);

  // Compute screen position and size of the text block
  const getOverlayStyle = useCallback((): React.CSSProperties => {
    const pos = engine.block.getPosition(blockId);
    const size = engine.block.getSize(blockId);
    const zoom = engine.editor.getZoom();

    const topLeft = engine.editor.worldToScreen({ x: pos.x, y: pos.y });
    const bottomRight = engine.editor.worldToScreen({ x: pos.x + size.width, y: pos.y + size.height });

    if (!topLeft || !bottomRight) return { display: 'none' };

    // Get canvas container offset so overlay is positioned relative to the viewport
    const canvasEl = canvasRef.current;
    const canvasRect = canvasEl?.getBoundingClientRect();
    const offsetX = canvasRect?.left ?? 0;
    const offsetY = canvasRect?.top ?? 0;

    return {
      position: 'fixed',
      left: topLeft.x + offsetX,
      top: topLeft.y + offsetY,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y,
      fontSize: `${(engine.block.getTextRuns(blockId)[0]?.style.fontSize ?? 24) * zoom}px`,
      zIndex: 50,
      overflow: 'hidden',
      outline: '2px solid hsl(var(--primary))',
      borderRadius: '2px',
      background: 'rgba(255,255,255,0.85)',
      padding: '2px',
      boxSizing: 'border-box',
    };
  }, [engine, blockId, canvasRef]);

  // Hide the Konva text node while overlay is active, restore on unmount
  useEffect(() => {
    engine.block.setBool(blockId, VISIBLE, false);
    return () => {
      engine.block.setBool(blockId, VISIBLE, true);
    };
  }, [engine, blockId]);

  // Populate contentEditable from engine runs on mount
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const runs = engine.block.getTextRuns(blockId);
    el.innerHTML = runsToHtml(runs);

    // Focus and place cursor at end
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      sel.selectAllChildren(el);
      sel.collapseToEnd();
    }
  }, [engine, blockId]);

  // Sync edits back to engine
  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    const newRuns = htmlToRuns(el);
    engine.block.setProperty(blockId, TEXT_RUNS, newRuns);
  }, [engine, blockId]);

  // Track selection changes
  const handleSelect = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;

    const range = getSelectionRange(el);
    setTextSelectionRange(range);
  }, [setTextSelectionRange]);

  // IMP-4: Paste plain text only
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // Close on Escape, blur
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  }, [onClose]);

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Don't close if focus moves to a toolbar within the editor
    const related = e.relatedTarget as HTMLElement | null;
    if (related && related.closest('[data-text-toolbar]')) return;
    onClose();
  }, [onClose]);

  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      style={getOverlayStyle()}
      onInput={handleInput}
      onSelect={handleSelect}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className="cursor-text whitespace-pre-wrap break-words"
      data-testid="text-editor-overlay"
    />
  );
};
