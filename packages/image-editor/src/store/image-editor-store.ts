import { create } from 'zustand';

export type ImageEditorTool = 'select' | 'crop' | 'rotate' | 'adjust' | 'filter' | 'resize' | 'shapes' | 'text' | 'pen';

export interface OriginalImageInfo {
  src: string;
  width: number;
  height: number;
}

interface ImageEditorState {
  activeTool: ImageEditorTool;
  originalImage: OriginalImageInfo | null;
  isLoading: boolean;
  imageBlockId: number | null;

  setActiveTool: (tool: ImageEditorTool) => void;
  setOriginalImage: (info: OriginalImageInfo) => void;
  setLoading: (loading: boolean) => void;
  setImageBlockId: (id: number | null) => void;
}

export const useImageEditorStore = create<ImageEditorState>((set) => ({
  activeTool: 'select',
  originalImage: null,
  isLoading: true,
  imageBlockId: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setOriginalImage: (info) => set({ originalImage: info }),
  setLoading: (loading) => set({ isLoading: loading }),
  setImageBlockId: (id) => set({ imageBlockId: id }),
}));
