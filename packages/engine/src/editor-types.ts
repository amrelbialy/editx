// ── Export ──

export interface ExportOptions {
  /** Image format. Default: 'png'. */
  format?: "png" | "jpeg" | "webp";
  /** Quality 0–1 for jpeg/webp. Ignored for png. Default: 0.92. */
  quality?: number;
  /** Device pixel ratio multiplier for high-res export. Default: 1. */
  pixelRatio?: number;
}

/**
 * Built-in edit modes for the editor.
 *
 * - `Transform` — default mode: select, move, resize, rotate blocks
 * - `Crop`      — crop overlay is active on a block
 * - `Text`      — inline text editing is active
 * - `Playback`  — timeline / video playback mode
 * - `Trim`      — video trim mode
 *
 * Custom string values are also accepted by `setEditMode()`.
 */
export type EditMode = "Transform" | "Crop" | "Text" | "Playback" | "Trim" | (string & {});

/**
 * Cursor types the renderer may display based on edit mode and hover target.
 */
export type CursorType =
  | "default"
  | "pointer"
  | "crosshair"
  | "move"
  | "grab"
  | "grabbing"
  | "text"
  | "not-allowed"
  | "nwse-resize"
  | "nesw-resize"
  | "ns-resize"
  | "ew-resize"
  | "col-resize"
  | "row-resize"
  | "none";

/**
 * Configuration for each edit mode — defines behavior inherited by the mode.
 */
export interface EditModeConfig {
  /** The cursor to show by default in this mode. */
  defaultCursor: CursorType;
  /** Whether the transformer handles are shown. */
  showTransformer: boolean;
  /** Whether blocks are selectable. */
  blocksSelectable: boolean;
  /** Whether blocks are draggable. */
  blocksDraggable: boolean;
}

/** Default configuration per built-in edit mode. */
export const EDIT_MODE_DEFAULTS: Record<string, EditModeConfig> = {
  Transform: {
    defaultCursor: "default",
    showTransformer: true,
    blocksSelectable: true,
    blocksDraggable: true,
  },
  Crop: {
    defaultCursor: "crosshair",
    showTransformer: false,
    blocksSelectable: false,
    blocksDraggable: false,
  },
  Text: {
    defaultCursor: "text",
    showTransformer: false,
    blocksSelectable: false,
    blocksDraggable: false,
  },
  Playback: {
    defaultCursor: "default",
    showTransformer: false,
    blocksSelectable: false,
    blocksDraggable: false,
  },
  Trim: {
    defaultCursor: "col-resize",
    showTransformer: false,
    blocksSelectable: false,
    blocksDraggable: false,
  },
};
