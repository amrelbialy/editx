import { create } from 'zustand';

export type Tool = 'select' | 'rectangle' | 'circle' | 'text';

interface EditorState {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),
}));
