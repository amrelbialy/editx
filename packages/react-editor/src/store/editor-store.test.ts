import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editor-store';

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      activeTool: 'select',
    });
  });

  describe('initial state', () => {
    it('activeTool is select', () => {
      expect(useEditorStore.getState().activeTool).toBe('select');
    });
  });

  describe('setActiveTool', () => {
    it('updates activeTool to rectangle', () => {
      useEditorStore.getState().setActiveTool('rectangle');
      expect(useEditorStore.getState().activeTool).toBe('rectangle');
    });

    it('updates activeTool to circle', () => {
      useEditorStore.getState().setActiveTool('circle');
      expect(useEditorStore.getState().activeTool).toBe('circle');
    });

    it('updates activeTool to text', () => {
      useEditorStore.getState().setActiveTool('text');
      expect(useEditorStore.getState().activeTool).toBe('text');
    });

    it('can reset to select', () => {
      useEditorStore.getState().setActiveTool('rectangle');
      useEditorStore.getState().setActiveTool('select');
      expect(useEditorStore.getState().activeTool).toBe('select');
    });
  });
});
