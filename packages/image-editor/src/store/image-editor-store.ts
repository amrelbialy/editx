import { create } from "zustand";

export type ImageEditorTool =
  | "select"
  | "crop"
  | "rotate"
  | "adjust"
  | "filter"
  | "resize"
  | "shapes"
  | "text"
  | "image"
  | "pen";

export type PropertySidePanel =
  | "color"
  | "background"
  | "shadow"
  | "position"
  | "stroke"
  | "adjust"
  | "filter"
  | "imageFill"
  | "text-advanced"
  | null;

export type CropPresetId = "free" | "original" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";

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
  editableBlockId: number | null;
  error: string | null;
  /** The image dimensions as rendered on canvas (after initial fit-to-screen). */
  shownImageDimensions: ShownImageDimensions | null;

  /** Current crop preset (only meaningful when activeTool === 'crop'). */
  cropPreset: CropPresetId;

  /** Block ID currently in inline text editing mode (double-clicked). null when not editing. */
  editingTextBlockId: number | null;
  /** Current text selection range within the inline editor. null when no selection. */
  textSelectionRange: { from: number; to: number } | null;

  /** Which property sub-panel is shown in the side panel (overrides tool panel content). */
  propertySidePanel: PropertySidePanel;

  setActiveTool: (tool: ImageEditorTool) => void;
  setOriginalImage: (info: OriginalImageInfo) => void;
  setLoading: (loading: boolean) => void;
  setEditableBlockId: (id: number | null) => void;
  setError: (msg: string | null) => void;
  clearError: () => void;
  setShownImageDimensions: (dims: ShownImageDimensions) => void;
  setCropPreset: (preset: CropPresetId) => void;
  setEditingTextBlockId: (id: number | null) => void;
  setTextSelectionRange: (range: { from: number; to: number } | null) => void;
  setPropertySidePanel: (panel: PropertySidePanel) => void;
}

export const useImageEditorStore = create<ImageEditorState>((set) => ({
  activeTool: "select",
  originalImage: null,
  isLoading: true,
  editableBlockId: null,
  error: null,
  shownImageDimensions: null,
  cropPreset: "free",

  editingTextBlockId: null,
  textSelectionRange: null,
  propertySidePanel: null,

  setActiveTool: (tool) => set({ activeTool: tool, propertySidePanel: null }),
  setOriginalImage: (info) => set({ originalImage: info }),
  setLoading: (loading) => set({ isLoading: loading }),
  setEditableBlockId: (id) => set({ editableBlockId: id }),
  setError: (msg) => set({ error: msg }),
  clearError: () => set({ error: null }),
  setShownImageDimensions: (dims) => set({ shownImageDimensions: dims }),
  setCropPreset: (preset) => set({ cropPreset: preset }),
  setEditingTextBlockId: (id) => set({ editingTextBlockId: id }),
  setTextSelectionRange: (range) => set({ textSelectionRange: range }),
  setPropertySidePanel: (panel) => set({ propertySidePanel: panel }),
}));
