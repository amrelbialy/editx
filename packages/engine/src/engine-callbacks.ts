/** Info emitted when the active edit mode changes. */
export interface EditModeChange {
  mode: string;
  previousMode: string;
}

/** Whether a live on-canvas gesture is a move (drag) or a resize/rotate. */
export type BlockTransformPhase = "drag" | "resize";

/**
 * Emitted continuously while a block is being dragged or resized on-canvas,
 * before the gesture is committed to the command/history system. Use this to
 * react to a block's live geometry (e.g. tracking its on-screen rect) without
 * polling. The committed change is later delivered as a normal `updated`
 * {@link BlockEvent} through the command EventAPI.
 */
export interface BlockTransformEvent {
  block: number;
  phase: BlockTransformPhase;
}

/** Read-only camera state (screen-space mapping inputs). */
export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

/**
 * Owns the typed public callback registrations exposed by `EditxEngine`
 * (history / zoom / pan / edit-mode / live block-transform). Keeps the engine
 * core lean while giving each event a precise, self-documenting signature.
 */
export class EngineCallbacks {
  #history = new Set<() => void>();
  #zoom = new Set<(zoom: number) => void>();
  #pan = new Set<(pan: { x: number; y: number }) => void>();
  #editMode = new Set<(info: EditModeChange) => void>();
  #blockTransform = new Set<(event: BlockTransformEvent) => void>();

  onHistoryChanged(cb: () => void): () => void {
    return this.#add(this.#history, cb);
  }
  onZoomChanged(cb: (zoom: number) => void): () => void {
    return this.#add(this.#zoom, cb);
  }
  onPanChanged(cb: (pan: { x: number; y: number }) => void): () => void {
    return this.#add(this.#pan, cb);
  }
  onEditModeChanged(cb: (info: EditModeChange) => void): () => void {
    return this.#add(this.#editMode, cb);
  }
  onBlockTransform(cb: (event: BlockTransformEvent) => void): () => void {
    return this.#add(this.#blockTransform, cb);
  }

  fireHistory(): void {
    for (const cb of this.#history) cb();
  }
  fireZoom(zoom: number): void {
    for (const cb of this.#zoom) cb(zoom);
  }
  firePan(pan: { x: number; y: number }): void {
    for (const cb of this.#pan) cb(pan);
  }
  fireEditMode(info: EditModeChange): void {
    for (const cb of this.#editMode) cb(info);
  }
  fireBlockTransform(event: BlockTransformEvent): void {
    for (const cb of this.#blockTransform) cb(event);
  }

  #add<T>(set: Set<T>, cb: T): () => void {
    set.add(cb);
    return () => {
      set.delete(cb);
    };
  }
}

/** Runtime guard for a `{ x, y }` point payload (e.g. `pan:changed`). */
export function isPoint(v: unknown): v is { x: number; y: number } {
  return typeof v === "object" && v !== null && "x" in v && "y" in v;
}

/** Runtime guard for an {@link EditModeChange} payload. */
export function isEditModeChange(v: unknown): v is EditModeChange {
  return typeof v === "object" && v !== null && "mode" in v && "previousMode" in v;
}

/** Runtime guard for a {@link BlockTransformEvent} payload. */
export function isBlockTransform(v: unknown): v is BlockTransformEvent {
  return typeof v === "object" && v !== null && "block" in v && "phase" in v;
}
