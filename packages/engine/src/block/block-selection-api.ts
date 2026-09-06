import type { EngineCore } from "../engine-core";
import type { BlockType } from "./block.types";

/** Selection state management and transformer overlay control. */
export class BlockSelectionAPI {
  #engine: EngineCore;
  #selection = new Set<number>();
  #transformerEnabled = true;
  #selectionListeners = new Set<(ids: number[]) => void>();
  #dblClickListeners = new Set<(blockId: number, screenPos?: { x: number; y: number }) => void>();
  #groupContext: number[] = [];
  #groupContextListeners = new Set<(stack: number[]) => void>();

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
  onBlockDoubleClick(
    cb: (blockId: number, screenPos?: { x: number; y: number }) => void,
  ): () => void {
    this.#dblClickListeners.add(cb);
    return () => {
      this.#dblClickListeners.delete(cb);
    };
  }

  /** @internal — fire double-click listeners (called by EditxEngine). */
  _notifyBlockDoubleClick(blockId: number, screenPos?: { x: number; y: number }): void {
    for (const cb of this.#dblClickListeners) cb(blockId, screenPos);
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

  /** @internal — remove destroyed block IDs from selection (used by undo/redo). */
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

  // ── Group context (enter/exit navigation — NOT undoable) ───────────

  /** Descend into a group; pushes it onto the context stack and notifies. */
  enterGroup(groupId: number): void {
    if (this.#groupContext[this.#groupContext.length - 1] === groupId) return;
    this.#groupContext.push(groupId);
    this.#notifyGroupContext();
  }

  /** Ascend one level; no-op at the top level. */
  exitGroup(): void {
    if (this.#groupContext.length === 0) return;
    this.#groupContext.pop();
    this.#notifyGroupContext();
  }

  /** Current context stack, OUTERMOST-first. `[]` means top level. */
  getGroupContext(): number[] {
    return [...this.#groupContext];
  }

  /** Subscribe to context changes (enter/exit/clear only). Returns unsubscribe. */
  onGroupContextChanged(cb: (stack: number[]) => void): () => void {
    this.#groupContextListeners.add(cb);
    return () => {
      this.#groupContextListeners.delete(cb);
    };
  }

  /** @internal — clear the whole stack (empty-canvas / cross-context selection). */
  _clearGroupContext(): void {
    if (this.#groupContext.length === 0) return;
    this.#groupContext = [];
    this.#notifyGroupContext();
  }

  #notifyGroupContext(): void {
    const stack = [...this.#groupContext];
    this.#engine.emit("groupContext:changed", stack);
    for (const cb of this.#groupContextListeners) cb(stack);
  }

  #syncTransformer(): void {
    const ids = [...this.#selection];
    this.#engine.emit("selection:changed", ids);
    for (const cb of this.#selectionListeners) cb(ids);
    const renderer = this.#engine.getRenderer();
    if (ids.length > 0 && this.#transformerEnabled) {
      const blockType: BlockType | undefined =
        ids.length === 1 ? this.#engine._getBlockStore().getType(ids[0]) : undefined;
      renderer?.showTransformer(ids, blockType);
    } else {
      renderer?.hideTransformer();
    }
  }
}
