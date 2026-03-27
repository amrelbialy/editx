import type { EngineCore } from "../engine-core";
import type { BlockType } from "./block.types";

/** Selection state management and transformer overlay control. */
export class BlockSelectionAPI {
  #engine: EngineCore;
  #selection = new Set<number>();
  #transformerEnabled = true;
  #selectionListeners = new Set<(ids: number[]) => void>();
  #dblClickListeners = new Set<(blockId: number) => void>();

  constructor(engine: EngineCore) {
    this.#engine = engine;
  }

  /** Subscribe to selection changes. Returns an unsubscribe function. */
  onSelectionChanged(cb: (ids: number[]) => void): () => void {
    this.#selectionListeners.add(cb);
    return () => {
      this.#selectionListeners.delete(cb);
    };
  }

  /** Subscribe to block double-click events. Returns an unsubscribe function. */
  onBlockDoubleClick(cb: (blockId: number) => void): () => void {
    this.#dblClickListeners.add(cb);
    return () => {
      this.#dblClickListeners.delete(cb);
    };
  }

  /** @internal â€” fire double-click listeners (called by EditxEngine). */
  _notifyBlockDoubleClick(blockId: number): void {
    for (const cb of this.#dblClickListeners) cb(blockId);
  }

  select(id: number): void {
    this.#selection.clear();
    this.#selection.add(id);
    this.#syncTransformer();
  }

  setSelected(id: number, selected: boolean): void {
    if (selected) {
      this.#selection.add(id);
    } else {
      this.#selection.delete(id);
    }
    this.#syncTransformer();
  }

  isSelected(id: number): boolean {
    return this.#selection.has(id);
  }

  findAllSelected(): number[] {
    return [...this.#selection];
  }

  deselectAll(): void {
    this.#selection.clear();
    this.#syncTransformer();
  }

  /** @internal â€” remove destroyed block IDs from selection (used by undo/redo). */
  _removeFromSelection(ids: number[]): void {
    let changed = false;
    for (const id of ids) {
      if (this.#selection.delete(id)) changed = true;
    }
    if (changed) this.#syncTransformer();
  }

  setTransformerEnabled(enabled: boolean): void {
    this.#transformerEnabled = enabled;
    this.#syncTransformer();
  }

  #syncTransformer(): void {
    const ids = [...this.#selection];
    this.#engine.emit("selection:changed", ids);
    for (const cb of this.#selectionListeners) cb(ids);
    const renderer = this.#engine.getRenderer();
    if (ids.length > 0 && this.#transformerEnabled) {
      const blockType: BlockType | undefined =
        ids.length === 1 ? this.#engine.getBlockStore().getType(ids[0]) : undefined;
      renderer?.showTransformer(ids, blockType);
    } else {
      renderer?.hideTransformer();
    }
  }
}
