import type { EditxEngine } from "@editx/engine";
import type React from "react";
import type { ImageSource } from "../../image-editor";
import type { OriginalImageInfo, ShownImageDimensions } from "../../store/image-editor-store";
import type { ImageValidationOptions } from "../../utils/validate-image";

export interface UseEngineOptions {
  src: ImageSource;
  validation?: ImageValidationOptions;
  keepZoomOnSourceChange?: boolean;
}

export interface UseEngineResult {
  containerRef: React.RefObject<HTMLDivElement | null>;
  engine: EditxEngine | null;
  engineRef: React.RefObject<EditxEngine | null>;
  initEditor: (source: ImageSource, signal?: { disposed: boolean }) => Promise<void>;
  handleRetry: () => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handlePaste: (e: React.ClipboardEvent) => void;
  selectedShapeId: number | null;
  setSelectedShapeId: React.Dispatch<React.SetStateAction<number | null>>;
}

/** Zoom/pan snapshot preserved across source changes. */
export type ZoomSnapshot = { zoom: number; pan: { x: number; y: number } };

/**
 * Everything `runInit` needs: refs shared with the hook, store setters, local
 * state setters and the resolved options. Passing these in (rather than closing
 * over them) keeps `initEditor`'s `useCallback` dependency array stable.
 */
export interface InitContext {
  containerRef: React.RefObject<HTMLDivElement | null>;
  engineRef: React.RefObject<EditxEngine | null>;
  blobUrlRef: React.RefObject<string | null>;
  loadedSourceRef: React.RefObject<ImageSource | null>;
  loadingSourceIdentityRef: React.RefObject<string | null>;
  prevZoomRef: React.RefObject<ZoomSnapshot | null>;
  setEngine: (engine: EditxEngine | null) => void;
  setSelectedShapeId: React.Dispatch<React.SetStateAction<number | null>>;
  cleanupBlobUrl: () => void;
  setOriginalImage: (info: OriginalImageInfo) => void;
  setLoading: (loading: boolean) => void;
  setEditableBlockId: (id: number | null) => void;
  setError: (msg: string | null) => void;
  clearError: () => void;
  setShownImageDimensions: (dims: ShownImageDimensions) => void;
  validation?: ImageValidationOptions;
  keepZoomOnSourceChange: boolean;
}
