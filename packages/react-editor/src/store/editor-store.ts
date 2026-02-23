import { create } from 'zustand';

export type Tool = 'select' | 'rectangle' | 'circle' | 'text';

interface EditorState {
  activeTool: Tool;
  sidebarOpen: boolean;
  setActiveTool: (tool: Tool) => void;
  toggleSidebar: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  sidebarOpen: true,
  setActiveTool: (tool) => set({ activeTool: tool }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
