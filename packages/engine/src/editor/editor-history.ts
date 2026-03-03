import type { EditorContext } from './editor-context';

/**
 * Delegates undo/redo operations to the Engine's history manager.
 * Thin wrapper that keeps EditorAPI's surface area clean.
 */
export class EditorHistory {
  #ctx: EditorContext;

  constructor(ctx: EditorContext) {
    this.#ctx = ctx;
  }

  undo(): void {
    this.#ctx.engine.undo();
  }

  redo(): void {
    this.#ctx.engine.redo();
  }

  canUndo(): boolean {
    return this.#ctx.engine.canUndo();
  }

  canRedo(): boolean {
    return this.#ctx.engine.canRedo();
  }

  clearHistory(): void {
    this.#ctx.engine.clearHistory();
  }
}
