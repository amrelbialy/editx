import { describe, it, expect, beforeEach } from 'vitest';
import { useImageEditorStore } from './image-editor-store';

describe('useImageEditorStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useImageEditorStore.setState({
      activeTool: 'select',
      originalImage: null,
      isLoading: true,
      imageBlockId: null,
    });
  });

  describe('initial state', () => {
    it('activeTool is select', () => {
      expect(useImageEditorStore.getState().activeTool).toBe('select');
    });

    it('originalImage is null', () => {
      expect(useImageEditorStore.getState().originalImage).toBeNull();
    });

    it('isLoading is true', () => {
      expect(useImageEditorStore.getState().isLoading).toBe(true);
    });

    it('imageBlockId is null', () => {
      expect(useImageEditorStore.getState().imageBlockId).toBeNull();
    });
  });

  describe('setActiveTool', () => {
    it('updates activeTool', () => {
      useImageEditorStore.getState().setActiveTool('crop');
      expect(useImageEditorStore.getState().activeTool).toBe('crop');
    });

    it('can cycle through tools', () => {
      const tools = ['select', 'crop', 'rotate', 'adjust', 'filter', 'resize', 'shapes', 'text', 'pen'] as const;
      for (const tool of tools) {
        useImageEditorStore.getState().setActiveTool(tool);
        expect(useImageEditorStore.getState().activeTool).toBe(tool);
      }
    });
  });

  describe('setOriginalImage', () => {
    it('updates originalImage', () => {
      const info = { src: 'test.png', width: 100, height: 200 };
      useImageEditorStore.getState().setOriginalImage(info);
      expect(useImageEditorStore.getState().originalImage).toEqual(info);
    });
  });

  describe('setLoading', () => {
    it('updates isLoading', () => {
      useImageEditorStore.getState().setLoading(false);
      expect(useImageEditorStore.getState().isLoading).toBe(false);
    });
  });

  describe('setImageBlockId', () => {
    it('updates imageBlockId', () => {
      useImageEditorStore.getState().setImageBlockId(42);
      expect(useImageEditorStore.getState().imageBlockId).toBe(42);
    });

    it('can set back to null', () => {
      useImageEditorStore.getState().setImageBlockId(42);
      useImageEditorStore.getState().setImageBlockId(null);
      expect(useImageEditorStore.getState().imageBlockId).toBeNull();
    });
  });
});
