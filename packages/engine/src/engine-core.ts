import type { ActivePageChangedEvent } from "./active-page";
import type { BlockStore } from "./block/block-store";
import type { Command } from "./controller/commands";
import type { BlockTransformEvent, EditModeChange } from "./engine-callbacks";
import type { EventAPI } from "./event-api";
import type { PageOrderChangedEvent } from "./page-order";
import type { RendererAdapter } from "./render-adapter";

/**
 * Internal interface for the engine runtime.
 *
 * Sub-APIs depend on this interface instead of the concrete
 * {@link EditxEngine} class to avoid circular imports.
 */
export interface EngineCore {
  readonly event: EventAPI;
  /** @internal — direct BlockStore access for sub-APIs; not part of the public surface. */
  _getBlockStore(): BlockStore;
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
  /** @internal — atomically replace navigation after scene creation or loading. */
  _setActiveSceneAndPage(sceneId: number | null, pageId: number | null): void;
  /** @internal — synchronously reconcile transient page isolation after document settlement. */
  _reconcilePageView(): void;
  /** @internal — settle interactions before replacing the current document's block identities. */
  _prepareSceneReplacement(): void;
  /** @internal — deliver observers after the current command or outer batch settles. */
  _deferNotification(callback: () => void): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clearHistory(): void;
  on(event: string, cb: (...args: unknown[]) => void): void;
  off(event: string, cb: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  onActivePageChanged(cb: (event: ActivePageChangedEvent) => void): () => void;
  onPageOrderChanged(cb: (event: PageOrderChangedEvent) => void): () => void;
  onHistoryChanged(cb: () => void): () => void;
  onZoomChanged(cb: (zoom: number) => void): () => void;
  onPanChanged(cb: (pan: { x: number; y: number }) => void): () => void;
  onEditModeChanged(cb: (info: EditModeChange) => void): () => void;
  onBlockTransform(cb: (event: BlockTransformEvent) => void): () => void;
}
