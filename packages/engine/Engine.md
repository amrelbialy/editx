---
## title: Engine Design & Implementation

# Engine Design — Editx

This document contains: 1) a concise design spec for the Engine (replacing Controller), and 2) a ready-to-drop TypeScript implementation skeleton (Engine, Command pattern, HistoryManager, SelectionManager, RendererAdapter interface) you can iterate on.
---

## Goals

- Keep **CreativeDocument** pure (serializable JSON) and free of runtime/rendering state.
- Provide a single **Engine** class that exposes a deterministic, testable API for UI + plugins.
- Implement a **Command** pattern for consistent undo/redo and auditability.
- Keep **RendererAdapter** replaceable; Engine must not leak renderer handles.
- Provide fine-grained dirty-tracking so adapters can batch updates and render efficiently.

---

## High-level responsibilities

- **Document management:** load/save/validate versions
- **Command execution:** create/update/delete nodes via commands
- **History & undo/redo:** diff-based history with command reversal
- **Selection management:** maintain selection state, multi-select, range select
- **Event bus:** publish events for node change, selection change, history change
- **Dirty tracking:** mark nodes dirty, expose dirty set for renderer adapters
- **Plugin system:** allow plugins to register commands, listeners, middleware
- **Renderer orchestration:** notify adapter of changes; adapter handles DOM/GL

---

## Engine public API (concept)

```ts
interface EngineOptions {
  document: CreativeDocument;
  renderer: RendererAdapter;
}

class Engine {
  constructor(options: EngineOptions);

  // document
  loadDocument(doc: CreativeDocument): void;
  getDocument(): CreativeDocument;

  // commands
  exec(commandName: string, payload: any): CommandResult;
  registerCommand(commandName: string, command: CommandFactory);

  // selection
  getSelection(): string[];
  setSelection(ids: string[]): void;

  // history
  undo(): void;
  redo(): void;

  // events
  on(event: EngineEvent, cb: Function): Unsub;
  off(event: EngineEvent, cb: Function): void;
}
```

---

## Core interfaces

### RendererAdapter

```ts
export interface RendererAdapter {
  init(options: { rootEl: HTMLElement }): Promise<void>;
  createNode(node: EngineNode): RendererHandle;
  updateNode(handle: RendererHandle, node: EngineNode): void;
  removeNode(handle: RendererHandle): void;
  renderFrame(): void; // request a render
  dispose(): void;
}
```

### EngineNode (document-facing node)

```ts
interface EngineNode {
  id: string;
  type: string;
  children?: string[]; // IDs to other nodes (engine stores nodes map)
  props?: Record<string, any>;
  transform?: {
    x: number;
    y: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
  };
  metadata?: Record<string, any>;
  locked?: boolean;
  undeletable?: boolean;
}
```

---

## Viewport clamping, live events & additive selection

These sections describe implemented public behavior layered on top of the concept API above.

### Zoom & pan clamping

The Konva camera funnels every viewport mutation (`setZoom`, `zoomAtPoint`, `panTo`, `panBy`, `fitToScreen`, `fitToRect`, `centerOnRect`) through a single clamp so bounds are applied consistently:

- Zoom is clamped to `[MIN_ZOOM, MAX_ZOOM]` (`0.05`–`20`).
- Pan is clamped so page content stays reasonably in view.

The shared bounds and helper are exported from the Konva camera module:

```ts
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 20;
export function clampZoom(zoom: number): number;
```

> These are internal to the Konva renderer implementation (not re-exported from the package root). Consumers configure zoom bounds indirectly via `editor.setZoom()`, which clamps internally.

> **Behavior note:** pan is now clamped by *every* camera method. Previously some methods (notably `fitToScreen` and `centerOnRect`) applied pan without clamping.

### Event-driven viewport & transform callbacks

`EditxEngine` exposes typed subscription methods alongside the existing `onHistoryChanged` / `onZoomChanged` / `onEditModeChanged` callbacks. Each returns an unsubscribe function.

```ts
// Fires whenever the camera pan changes.
const offPan = engine.onPanChanged((pan: { x: number; y: number }) => {
  // pan.x / pan.y
});

// Fires continuously (live, pre-commit) while a block is dragged or resized on-canvas.
const offTransform = engine.onBlockTransform((e: BlockTransformEvent) => {
  // e.block, e.phase === "drag" | "resize"
});

offPan();
offTransform();
```

New exported types:

```ts
type BlockTransformPhase = "drag" | "resize";
interface BlockTransformEvent { block: number; phase: BlockTransformPhase }
interface ViewportState { zoom: number; pan: { x: number; y: number } }
interface EditModeChange { mode: string; previousMode: string }
```

> `onBlockTransform` is a **live notification stream only** — it emits during the gesture and creates no undo/history entry. The committed mutation still arrives separately as an `updated` `BlockEvent` through `engine.event.subscribe(...)`.

### Additive (marquee) selection

The renderer reports block clicks with a `BlockClickEvent` (from `render-adapter.ts`):

```ts
interface BlockClickEvent {
  shiftKey: boolean;
  additive?: boolean;
}
```

> `BlockClickEvent` is an internal renderer-adapter type (not re-exported from the package root) used to distinguish marquee-drag selection from a single shift-click.

- `additive: true` — union the block into the current selection (used by marquee-drag selection); never toggles or removes.
- `shiftKey: true` (without `additive`) — toggles a single block's selection membership (unchanged behavior).

---

## Implementation skeleton

The following TypeScript skeleton is intentionally small and focused — it gives you a working Engine with commands, history, selection, event bus, and a renderer adapter hook. Extend it to your needs.

```ts
// packages/engine/src/types.ts
export type ID = string;

export interface CreativeDocument {
  id: string;
  version: number;
  scene: {
    width: number;
    height: number;
    background?: string;
    root: ID; // id of root group
  };
  nodes: Record<ID, EngineNode>;
}

export interface EngineNode {
  /* as defined above */
}

// packages/engine/src/events.ts
export class EventBus {
  private listeners = new Map<string, Set<Function>>();
  on(event: string, fn: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
  }
  off(event: string, fn: Function) {
    this.listeners.get(event)?.delete(fn);
  }
  emit(event: string, payload?: any) {
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }
}

// packages/engine/src/history.ts
export interface Patch {
  id: ID;
  before: any;
  after: any;
}
export class HistoryManager {
  private stack: Patch[][] = [];
  private idx = -1;
  push(patches: Patch[]) {
    this.stack = this.stack.slice(0, this.idx + 1);
    this.stack.push(patches);
    this.idx++;
  }
  canUndo() {
    return this.idx >= 0;
  }
  undo(document: CreativeDocument) {
    if (!this.canUndo()) return;
    const patches = this.stack[this.idx--]; /* apply reverse */
  }
  redo(document: CreativeDocument) {
    /* ... */
  }
}

// packages/engine/src/commands.ts
export interface Command {
  do(doc: CreativeDocument): Patch[]; // returns patches applied
  undo(doc: CreativeDocument): Patch[];
}

// example createNode command
export class CreateNodeCommand implements Command {
  constructor(private node: EngineNode) {}
  do(doc: CreativeDocument) {
    doc.nodes[this.node.id] = this.node;
    return [{ id: this.node.id, before: null, after: this.node }];
  }
  undo(doc: CreativeDocument) {
    delete doc.nodes[this.node.id];
    return [{ id: this.node.id, before: this.node, after: null }];
  }
}

// packages/engine/src/engine.ts
export class Engine {
  private doc: CreativeDocument;
  private events = new EventBus();
  private history = new HistoryManager();
  private renderer?: RendererAdapter;
  private dirty = new Set<ID>();
  private selection: ID[] = [];

  constructor(opts: { document: CreativeDocument; renderer?: RendererAdapter }) {
    this.doc = opts.document;
    this.renderer = opts.renderer;
  }

  loadDocument(doc: CreativeDocument) {
    this.doc = doc;
    this.events.emit('document:loaded', doc);
  }
  getDocument() {
    return this.doc;
  }

  exec(command: Command) {
    const patches = command.do(this.doc);
    this.history.push(patches);
    patches.forEach((p) => this.dirty.add(p.id));
    this.events.emit(
      'nodes:updated',
      patches.map((p) => p.id)
    );
    this.flush();
  }

  undo() {
    this.history.undo(this.doc); /* emit & flush */
  }
  redo() {
    this.history.redo(this.doc);
  }

  setSelection(ids: ID[]) {
    this.selection = ids;
    this.events.emit('selection:changed', ids);
  }
  getSelection() {
    return this.selection;
  }

  on(evt: string, cb: Function) {
    this.events.on(evt, cb);
  }
  off(evt: string, cb: Function) {
    this.events.off(evt, cb);
  }

  private flush() {
    if (!this.renderer) return;
    const dirtyIds = Array.from(this.dirty);
    dirtyIds.forEach((id) => {
      const node = this.doc.nodes[id];
      // adapter signaling
      // renderer.updateNode(handleMap[id], node) // handleMap lives inside adapter
    });
    this.dirty.clear();
    this.renderer.renderFrame();
  }
}
```

---

## Next steps / integration notes

- Wire renderer adapters to the engine by listening to `nodes:updated` and `document:loaded` events.
- Keep renderer handles inside the adapter. Adapter maps Engine node IDs to renderer handles.
- Ensure commands return patches for history. Prefer patches over full copies.
- Add JSON schema validation in `engine.loadDocument` to guarantee version compatibility.
- Build visual regression tests for adapter parity.

---

## Appendix: Common commands to implement first

- createNode
- deleteNode
- updateNodeProps
- moveNode (reparent + position)
- setSelection
- group/ungroup
- setLayerOrder
- applyAdjustment
- importImage
- exportScene

---
