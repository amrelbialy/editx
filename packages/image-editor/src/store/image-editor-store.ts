import { create } from 'zustand';

export type ImageEditorTool = 'select' | 'crop' | 'rotate' | 'adjust' | 'filter' | 'resize' | 'shapes' | 'text' | 'pen';

export interface OriginalImageInfo {
  src: string;
  width: number;
  height: number;
  /** Human-readable filename extracted from source (for save/export). */
  name: string;
}

export interface ShownImageDimensions {
  /** Pixel width as rendered on canvas. */
  width: number;
  /** Pixel height as rendered on canvas. */
  height: number;
  /** Scale factor applied to original dimensions. */
  scale: number;
}

interface ImageEditorState {
  activeTool: ImageEditorTool;
  originalImage: OriginalImageInfo | null;
  isLoading: boolean;
  imageBlockId: number | null;
  error: string | null;
  /** The image dimensions as rendered on canvas (after initial fit-to-screen). */
  shownImageDimensions: ShownImageDimensions | null;

  setActiveTool: (tool: ImageEditorTool) => void;
  setOriginalImage: (info: OriginalImageInfo) => void;
  setLoading: (loading: boolean) => void;
  setImageBlockId: (id: number | null) => void;
  setError: (msg: string | null) => void;
  clearError: () => void;
  setShownImageDimensions: (dims: ShownImageDimensions) => void;
}

export const useImageEditorStore = create<ImageEditorState>((set) => ({
  activeTool: 'select',
  originalImage: null,
  isLoading: true,
  imageBlockId: null,
  error: null,
  shownImageDimensions: null,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setOriginalImage: (info) => set({ originalImage: info }),
  setLoading: (loading) => set({ isLoading: loading }),
  setImageBlockId: (id) => set({ imageBlockId: id }),
  setError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),
  setShownImageDimensions: (dims) => set({ shownImageDimensions: dims }),
}));
