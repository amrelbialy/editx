import type { EditxArchiveInfoV1, EditxEngine } from "@editx/engine";
import type {
  CloseReason,
  EditorEventCallbacks,
  EditorSlots,
  ImageEditorConfig,
} from "./config/config.types";
import type { ImageValidationOptions } from "./utils/validate-image";

export type ImageSource = string | File | Blob | HTMLImageElement | HTMLCanvasElement;

/** Imperative handle exposed through ImageEditorProps.onReady. */
export interface EditorHandle {
  /** Serialize the full scene (all blocks) to a JSON string. */
  saveScene(): string;
  /** Restore a scene previously produced by saveScene. */
  loadScene(json: string): Promise<void>;
  /** Create an editable `.editx` archive Blob, including an authored-root PNG preview. */
  saveProject(): Promise<Blob>;
  /** Open a validated `.editx` archive. File is accepted because it extends Blob. */
  loadProject(source: Blob | Uint8Array): Promise<EditxArchiveInfoV1>;
  /** The underlying engine instance, for advanced/headless use. */
  engine: EditxEngine;
}

export interface ImageEditorProps {
  src: ImageSource;
  /**
   * Receives an image blob, or an application/zip blob for Selected/All pages
   * in opt-in multi-page mode. Without a handler, the editor downloads the file.
   */
  onSave?: (blob: Blob) => void;
  onClose?: (reason?: CloseReason, hasUnsavedChanges?: boolean) => void;
  /** Fires once when the engine is ready, exposing an imperative editor handle. */
  onReady?: (handle: EditorHandle) => void;
  width?: string | number;
  height?: string | number;
  /** Validation options for file type, size, and dimension limits. */
  validation?: ImageValidationOptions;
  /** When true, preserve zoom/pan when src changes instead of resetting to fit-to-screen. */
  keepZoomOnSourceChange?: boolean;
  /** SDK configuration — tools, theme, per-tool options, UI tweaks. */
  config?: ImageEditorConfig;
  /** Named render slots for injecting custom UI into the editor shell. */
  slots?: EditorSlots;
  /** Event callbacks for editor lifecycle events. */
  events?: EditorEventCallbacks;
}
