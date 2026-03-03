import type { Engine } from '../engine';
import type { RendererAdapter } from '../render-adapter';
import type { BlockAPI } from '../block/block-api';

/**
 * Shared context passed to every editor sub-module.
 *
 * Holds the core references that all sub-modules need.
 * The `block` field is set lazily (after construction) via `setBlock()`.
 */
export interface EditorContext {
  readonly engine: Engine;
  readonly renderer: RendererAdapter | null;
  block: BlockAPI | null;
}
