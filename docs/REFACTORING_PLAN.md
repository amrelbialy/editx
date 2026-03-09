# Codebase Refactoring Plan

**Status:** done
**Priority:** Do this BEFORE Feature 1 Improvements and Feature 2 (Crop)

A clean, well-separated codebase makes every future feature easier to implement. This plan addresses file length issues, god classes, dead code, duplicated logic, and missing abstractions identified in the current codebase.

---

## Summary of Problems

| Problem                                             | Severity     | Where                                        |
| --------------------------------------------------- | ------------ | -------------------------------------------- |
| God class (494 lines, 7+ responsibilities)          | **Critical** | `konva-renderer-adapter.ts`                  |
| Abandoned dead code (461 + 169 lines)               | High         | `pixi-renderer-adapter.ts`, `transformer.ts` |
| 60+ `console.log` statements                        | High         | Across entire codebase                       |
| Duplicated code (`colorToHex`, image loading)       | Medium       | Multiple files                               |
| Two parallel event systems                          | Medium       | `EventBus` + `EventAPI`                      |
| Type safety gaps (`any` in Patch, untyped metadata) | Medium       | `history-manager.ts`, konva adapter          |
| No `dispose()` on `CreativeEngine` facade           | Medium       | `creative-engine.ts`                         |
| Missing shared utilities                            | Medium       | Color, image loading                         |
| BlockStore mixes 5 concerns (208 lines)             | Medium       | `block-store.ts`                             |
| BlockAPI repetitive setters + setKind bypass        | Medium       | `block-api.ts`                               |
| Nested batch bug risk                               | Low          | `block-api.ts` + `creative-engine.ts`        |
| Mutable default color references                    | Low          | `block-defaults.ts`                          |

---

## Steps

### Step 1: Remove Dead Code

**Files to delete:**

- `packages/engine/src/pixi-renderer-adapter.ts` (461 lines) — does NOT implement the current `RendererAdapter` interface, uses the old `createLayer`/`updateLayer` API, ~80 lines of commented-out code, ~30 console.logs. Completely abandoned.
- `packages/engine/src/transformer/transformer.ts` (169 lines) — PixiJS-only, incomplete (visual wireframe only, no interaction), ~20 console.logs. Only used by the dead pixi adapter.
- Delete the `packages/engine/src/transformer/` directory entirely.

**Code to clean up:**

- Remove the `'pixi'` branch comment in `creative-engine.ts` `create()` — renderer option type should be `'konva'` only (or removed entirely until pixi is reimplemented).
- Remove `sidebarOpen` from `packages/react-editor/src/store/editor-store.ts` — never read anywhere.
- Remove the unused dependency on `@creative-editor/react-editor` from `packages/image-editor/package.json` if it's never imported.

**Estimated line reduction:** ~630 lines of dead code removed.

---

### Step 2: Remove All Console.log Statements

Sweep the entire codebase and remove all `console.log` calls:

| File                                 | Approx. count |
| ------------------------------------ | ------------- |
| `engine.ts`                          | 2             |
| `creative-engine.ts`                 | 2             |
| `block-store.ts`                     | 1 (commented) |
| `creative-editor.tsx` (react-editor) | 1             |
| `layer-panel.tsx`                    | 1             |
| `properties-panel.tsx`               | 1             |

For now, simply delete them. If debug logging is needed in the future, introduce a configurable logger utility.

---

### Step 3: Extract Shared Utilities

Create `packages/engine/src/utils/` directory for shared logic:

#### 3a. `packages/engine/src/utils/color.ts`

Extract `colorToHex()` from `konva-renderer-adapter.ts` (line 4) and `hexToColor()` from `properties-panel.tsx` (lines 14–28). Both are duplicated. Place in a single shared module.

**Consumers that import the shared version:**

- `konva-renderer-adapter.ts` — remove inline `colorToHex()`
- `properties-panel.tsx` (react-editor) — remove inline `colorToHex()` and `hexToColor()`

#### 3b. `packages/engine/src/utils/image-loader.ts`

Consolidate the two separate image caches and loading functions:

- `packages/image-editor/src/utils/load-image.ts` → `imageCache` + `loadImage()`
- `konva-renderer-adapter.ts` → `#imageCache` + `#loadImage()`

Create a single `ImageLoader` class (or module with functions) that:

- Maintains one `Map<string, HTMLImageElement>` cache
- Provides `loadImage(src: string): Promise<HTMLImageElement>`
- Provides `evict(src: string)` for cache invalidation (e.g., on blob URL revoke)
- Sets `crossOrigin = 'anonymous'` by default
- Is instantiated once and shared via the engine

**Consumers:**

- `konva-renderer-adapter.ts` — receives `ImageLoader` instance, removes private cache
- `image-editor.tsx` / `load-image.ts` — uses the same `ImageLoader` via engine

#### 3c. `packages/engine/src/utils/index.ts`

Barrel export for all utils.

---

### Step 4: Break Up the Konva God Class

`konva-renderer-adapter.ts` currently handles **7 distinct responsibilities** in 494 lines. Split into focused modules:

#### Target structure:

```
packages/engine/src/
  konva/
    konva-renderer-adapter.ts    -- Orchestrator (~120 lines)
    konva-node-factory.ts        -- Node creation + update (~150 lines)
    konva-interaction-handler.ts -- User input handling (~100 lines)
    konva-camera.ts              -- Viewport control (~80 lines)
    index.ts                     -- Re-export KonvaRendererAdapter
```

#### 4a. `konva-camera.ts` — Camera / Viewport Controller

Extract from `konva-renderer-adapter.ts`:

- `setZoom()`, `getZoom()`, `panTo()`, `getPan()`
- `fitToScreen()`, `centerOnRect()`
- `screenToWorld()`, `worldToScreen()`
- `#applyCamera()` (private helper)
- Internal state: `#zoom`, `#pan`

Receives a reference to the Konva `Stage` and the `contentLayer`.

#### 4b. `konva-node-factory.ts` — Node Creation & Update

Extract from `konva-renderer-adapter.ts`:

- `#createNode(id, block)` — type-based dispatch to create Konva nodes
- `#updateNode(node, block)` — reads block properties, applies to Konva nodes
- Uses the shared `ImageLoader` from Step 3b (no more private `#loadImage`)
- Uses the shared `colorToHex` from Step 3a

Also split the 70-line `#updateNode()` into per-type updaters:

- `updateImageNode(node, block)`
- `updateTextNode(node, block)`
- `updateShapeNode(node, block)` (rect + ellipse share logic)

#### 4c. `konva-interaction-handler.ts` — Interaction / Input Handler

Extract from `konva-renderer-adapter.ts`:

- `#setupInteraction()` (currently 95 lines)
- Selection rectangle logic (mousedown/move/up)
- Block hit detection
- Click/drag event handling
- Receives callbacks: `onBlockClick`, `onBlockDragEnd`, `onBlockTransformEnd`, `onStageClick`

#### 4d. `konva-renderer-adapter.ts` — Slim Orchestrator

What remains:

- `implements RendererAdapter`
- `init()`, `createScene()`, `dispose()`
- `syncBlock()`, `removeBlock()` — delegates to node factory
- `showTransformer()`, `hideTransformer()` — thin wrapper
- `renderFrame()` — delegates to stage
- Wires together camera, node factory, interaction handler

**Target: ~120 lines** (down from 494).

---

### Step 5: Split BlockStore & Clean Up BlockAPI

`block-store.ts` (208 lines) mixes 5 responsibilities that will grow as features are added. Split now before crop/filter/annotation properties make it worse.

#### Target structure:

```
packages/engine/src/block/
  block-store.ts              -- Core CRUD + registry (~60 lines)
  block-hierarchy.ts          -- Parent/child management (~50 lines)
  block-properties.ts         -- Property get/set with typed accessors (~60 lines)
  block-snapshot.ts           -- Snapshot/restore + deep copy (~50 lines)
  block-api.ts                -- Command-dispatching facade (cleaned up)
  block-defaults.ts           -- Default properties per type
  block.types.ts              -- Type definitions
  index.ts                    -- Barrel exports
```

#### 5a. `block-store.ts` — Core CRUD & Registry (slim)

Keep only:

- `#blocks` Map, `#nextId` counter
- `create()`, `get()`, `exists()`, `destroy()` (without recursive child logic — delegate to hierarchy)
- `getType()`, `getKind()`, `setKind()`, `getName()`, `setName()`
- `findByType()`, `findByKind()`

The `destroy()` method currently does recursive child destruction AND unparenting — split the hierarchy parts out. `BlockStore` composes `BlockHierarchy`, `BlockProperties`, and `BlockSnapshot`.

#### 5b. `block-hierarchy.ts` — Hierarchy Manager

Extract:

- `appendChild(parentId, childId)`
- `removeChild(parentId, childId)`
- `getChildren(id)`
- `getParent(id)`
- Recursive child destruction logic (from `destroy()`)

Receives a reference to the blocks Map from `BlockStore`.

#### 5c. `block-properties.ts` — Property Accessors

Extract:

- `setProperty(id, key, value)`
- `getProperty(id, key)`
- `getFloat()`, `getString()`, `getBool()`, `getColor()`
- `findAllProperties(id)`

Receives a reference to the blocks Map from `BlockStore`.

#### 5d. `block-snapshot.ts` — Snapshot & Restore

Extract:

- `snapshot(id)` — creates deep copy of a block
- `restore(data)` — restores a block from snapshot
- `#deepCopyProperties()` — private helper

Receives a reference to the blocks Map from `BlockStore`.

#### 5e. Clean up `block-api.ts`

- Replace the 4 identical typed setters (`setFloat`, `setString`, `setBool`, `setColor`) with a single generic `setProperty(id, key, value)` public method. Keep the typed variants as thin wrappers if the public API must stay stable.
- Fix `setKind()` — currently bypasses command pattern with an inline object. Create a `SetKindCommand` class or route through `SetPropertyCommand`.
- Document the nested batch situation: `setPosition()`/`setSize()` call `beginBatch()`/`endBatch()`, and `creative-engine.ts` `onBlockTransformEnd` also wraps in a batch. Add a comment noting this is intentional (inner batch is a no-op when already batching).

---

### Step 6: Add `dispose()` to CreativeEngine Facade

Currently cleanup requires: `engine.core.getRenderer()?.dispose()` — reaching into internals.

- Add a `dispose()` method on `CreativeEngine` that:
  - Calls `renderer.dispose()`
  - Clears the image loader cache
  - Removes event listeners
  - Sets an internal `#disposed` flag
- Update `image-editor.tsx` and `creative-editor.tsx` to call `engine.dispose()` instead of the internal path.

---

### Step 7: Type Safety Improvements

#### 7a. Type the `Patch` interface

In `history-manager.ts`, change:

```
before: any → before: BlockData | null
after: any  → after: BlockData | null
```

#### 7b. Replace `(node as any).__blockId` with typed metadata

In the konva adapter, use Konva node attributes instead of `any` casts:

- `node.setAttr('blockId', id)` / `node.getAttr('blockId')`
- Same for `__loadedSrc` → `node.setAttr('loadedSrc', src)`

#### 7c. Type the `EventBus`

Replace `Function` type with typed listener signatures:

```typescript
type EventMap = {
  "selection:changed": (ids: number[]) => void;
  "history:changed": () => void;
  "stage:click": () => void;
};
```

---

### Step 8: Minor Fixes

#### 8a. Deep copy defaults in `block-defaults.ts`

The current `getDefaultProperties()` returns a spread of the defaults object, but nested `Color` objects are shared references. Change to deep clone:

```typescript
return structuredClone(defaults[type]);
```

#### 8b. Remove unresolved design comment

In `creative-engine.ts`, the comment `"here adapter doesn't communicate with block api directly. Question: how to handle this?"` should be resolved and removed.

---

## Folder Structure After Refactoring

```
packages/engine/src/
  index.ts
  creative-engine.ts          -- Facade + factory (slim)
  engine.ts                   -- Core orchestrator
  render-adapter.ts           -- RendererAdapter interface
  scene.ts                    -- Scene API
  editor.ts                   -- Editor API
  event-api.ts                -- Block event API
  history-manager.ts          -- Undo/redo
  block/
    block-api.ts              -- Command-dispatching facade (cleaned up)
    block-store.ts            -- Core CRUD + registry (slim)
    block-hierarchy.ts        -- Parent/child management
    block-properties.ts       -- Property get/set with typed accessors
    block-snapshot.ts         -- Snapshot/restore + deep copy
    block-defaults.ts         -- Default properties per type
    block.types.ts            -- Type definitions
    index.ts
  controller/
    commands/
      commands.types.ts
      create-block-command.ts
      destroy-block-command.ts
      append-child-command.ts
      remove-child-command.ts
      set-property-command.ts
      patch-command.ts
      index.ts
  events/
    event-bus.ts
  konva/                       -- NEW: replaces single god file
    konva-renderer-adapter.ts  -- Slim orchestrator (~120 lines)
    konva-node-factory.ts      -- Node creation + update
    konva-interaction-handler.ts -- Input/selection handling
    konva-camera.ts            -- Viewport/zoom/pan
    index.ts
  utils/                       -- NEW: shared utilities
    color.ts                   -- colorToHex, hexToColor
    image-loader.ts            -- Shared image cache + loader
    index.ts
```

**Deleted:**

- ~~`pixi-renderer-adapter.ts`~~ (461 lines)
- ~~`transformer/transformer.ts`~~ (169 lines)
- ~~`konva-renderer-adapter.ts`~~ (replaced by `konva/` directory)

---

## Implementation Order

| Order | Step                                                       | Est. Effort | Risk                                         |
| ----- | ---------------------------------------------------------- | ----------- | -------------------------------------------- |
| 1     | Remove dead code (pixi adapter, transformer, unused state) | Small       | None — deletion only                         |
| 2     | Remove console.logs                                        | Small       | None                                         |
| 3     | Extract shared utilities (color, image-loader)             | Small       | Low — pure extraction                        |
| 4     | Break up konva god class into 4 modules                    | **Medium**  | Medium — must maintain all existing behavior |
| 5     | Split BlockStore + clean up BlockAPI                       | **Medium**  | Medium — core data layer, test carefully     |
| 6     | Add `dispose()` to CreativeEngine                          | Small       | Low                                          |
| 7     | Type safety improvements                                   | Small       | Low                                          |
| 8     | Minor fixes (deep copy defaults, comments)                 | Small       | Low                                          |

Steps 1–3 are safe, isolated changes. Step 4 is the main refactor — do it carefully with the demo app running to verify nothing breaks.

---

## Verification

- **After Step 1**: `pnpm build` succeeds, demo app loads and displays image, no runtime errors.
- **After Step 2**: No `console.log` output in browser dev tools (except Vite/HMR).
- **After Step 3**: `colorToHex` imported from `utils/color.ts` everywhere. Single image cache — load same URL twice, verify only one network request.
- **After Step 4**: Demo app works identically — image loads, centered, fitted, not draggable. The `konva/` folder has 4 files, each under 150 lines. `konva-renderer-adapter.ts` is ~120 lines.
- **After Step 5**: `block/` has 5 focused files. All existing block operations work unchanged. `setKind()` goes through command pattern. `setProperty()` works for all types.
- **After Step 6**: `engine.dispose()` works. `image-editor.tsx` no longer reaches into `core.getRenderer()`.
- **After Step 7**: No `any` casts in `Patch`, no `(node as any)` in konva code, `EventBus` is typed.
- **After Step 8**: Creating a block twice doesn't share Color references. Stale comments removed.

---

## Session Continuity

After this refactoring is complete:

1. Update `FOLDER_STRUCTURE.md` to reflect the actual new structure
2. Mark this plan as **done**
3. Proceed to **Feature 1 Improvements** (`docs/features/01-load-image.md` → Improvements section)
4. Then proceed to **Feature 2: Crop** (`docs/features/02-crop.md`)
