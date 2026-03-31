import type { BlockStore } from "./block/block-store";
import type { Command } from "./controller/commands";
import type { EventAPI } from "./event-api";
import type { RendererAdapter } from "./render-adapter";
import type { VariableAPI } from "./variable-api";

/**
 * Internal interface for the engine runtime.
 *
 * Sub-APIs depend on this interface instead of the concrete
 * {@link EditxEngine} class to avoid circular imports.
 */
export interface EngineCore {
  readonly event: EventAPI;
  readonly variable: VariableAPI;
  getBlockStore(): BlockStore;
  getRenderer(): RendererAdapter | null;
  exec(command: Command): void;
  beginBatch(): void;
  endBatch(): void;
  beginSilent(): void;
  endSilent(): void;
  renderDirty(): void;
  setActiveScene(id: number): void;
  getActiveScene(): number | null;
  setActivePage(id: number): void;
  getActivePage(): number | null;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
  off(event: string, cb: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  onHistoryChanged(cb: () => void): () => void;
  onZoomChanged(cb: (zoom: number) => void): () => void;
  onEditModeChanged(cb: (info: { mode: string; previousMode: string }) => void): () => void;
}
