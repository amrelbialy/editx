import { create } from 'zustand';

export type Tool = 'select' | 'rectangle' | 'circle' | 'text';

interface EditorState {
  activeTool: Tool;
  selectedLayerId: string | null;
  zoom: number;
  sidebarOpen: boolean;
  setActiveTool: (tool: Tool) => void;
  setSelectedLayer: (layerId: string | null) => void;
  setZoom: (zoom: number) => void;
  toggleSidebar: () => void;
  transformTick: number;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeTool: 'select',
  selectedLayerId: null,
  zoom: 1,
  sidebarOpen: true,
  transformTick: 0,
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSelectedLayer: (layerId) => set({ selectedLayerId: layerId }),
  setZoom: (zoom) => set({ zoom }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
