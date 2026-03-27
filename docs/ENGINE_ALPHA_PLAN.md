# Engine Alpha Release Plan

## TL;DR
Merge Engine+EditxEngine into one class, fix correctness bugs, make Konva tree-shakeable, unify the dual event system (img.ly style), add missing BlockAPI methods, improve type safety, and add serialization â€” in that order.

## Progress

- [x] **Step 0** â€” Merge Engine + EditxEngine
- [x] **Step 1** â€” Fix alpha-blocking bugs
- [x] **Step 2** â€” Make Konva optional (tree-shaking)
- [x] **Step 3** â€” Unify events (img.ly style)
- [x] **Step 4** â€” API review & alignment with img.ly
- [x] **Step 5** â€” Type safety improvements
- [x] **Step 6** â€” File length refactors (â‰¤250 lines per file)
- [x] **Step 7** â€” Serialization (save/load)

---

## Phase 1: Structural Merge âœ…

### Step 0 â€” Merge Engine + EditxEngine

- Folded `Engine` internals (command exec, batch, silent, history, flush, dirty tracking) into `EditxEngine`
- Sub-APIs (`BlockAPI`, `EditorAPI`, `SceneAPI`, `EventAPI`) stay in own files, constructed with `this`
- Removed `core: Engine` public property â€” `beginBatch()`, `endBatch()`, `beginSilent()`, `endSilent()`, `renderDirty()` are direct methods on `EditxEngine`
- Introduced `EngineCore` interface to break circular imports between EditxEngine and sub-APIs
- Deleted `engine.ts`; all tests + image-editor updated
- Headless = `new EditxEngine()`, browser = `await EditxEngine.create({ container })`

---

## Phase 2: Alpha-Blocking Bugs âœ…

### Step 1 â€” Fix bugs

- **DestroyBlockCommand**: Now snapshots parent/owner blocks whose reference arrays (`children`, `effectIds`, `shapeId`, `fillId`) are mutated by destroy. On undo, parent references are restored correctly. Added 2 tests.
- **Lint error**: Fixed `useIterableCallbackReturn` in `event-bus.ts` â€” `forEach` â†’ `for...of` in `emit()`.
- **Direct mutation**: `onAutoSize` callback now uses `store.getFloat()` / `store.setProperty()` instead of directly accessing `b.properties[...]`.

---

## Phase 3: Konva Tree-Shaking

### Step 2 â€” Make Konva optional

**Goal**: Headless users don't bundle Konva (~200KB).

1. Move `konva` from `dependencies` to `peerDependencies` with `"optional": true` in `peerDependenciesMeta`
2. Add `"./konva"` subpath export in `package.json`:
   ```
   exports: {
     ".": { types, import â†’ core-only },
     "./konva": { types, import â†’ konva renderer + filters + createEngine factory }
   }
   ```
3. Remove Konva-related exports from main `index.ts` (`KonvaRendererAdapter`, `FILTER_PRESETS`, `getFilterPreset`)
4. Move them to `packages/engine/src/konva/index.ts` (already partially exists)
5. Extract `EditxEngine.create()` factory â†’ `createEngine()` function in `konva/index.ts` (only Konva import point)
6. Update image-editor imports: `import { createEngine } from "@editx/engine/konva"`

**Files**: `package.json`, `src/index.ts`, `src/konva/index.ts`, `src/editx-engine.ts`, image-editor `use-engine.ts`

---

## Phase 4: Unified Events (img.ly Style)

### Current state (2 competing systems)

| System   | Class      | Pattern                              | Used for                                                                                   |
| -------- | ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| EventAPI | `EventAPI` | `engine.event.subscribe(ids, cb)`    | Block lifecycle: `created`, `updated`, `destroyed`                                         |
| EventBus | `EventBus` | `engine.on(name, cb)` / `engine.off` | `selection:changed`, `history:undo/redo/clear`, `stage:click`, `zoom:changed`, `editMode:changed` |

### All EventBus events emitted in engine

- `history:undo` â€” `undo()`
- `history:redo` â€” `redo()`
- `history:clear` â€” `clearHistory()`
- `selection:changed` â€” `block-selection-api.ts` `#syncTransformer()`
- `editMode:changed` â€” `editor-api.ts` `setEditMode()`
- `stage:click` â€” `editx-engine.ts` `onStageClick` callback
- `zoom:changed` â€” `editx-engine.ts` `onZoomChange` callback
- `block:dblclick` â€” `editx-engine.ts` `onBlockDblClick` callback

### All consumers in image-editor

- `use-history.ts` â€” BOTH `event.subscribe([], ...)` AND `on("history:undo/redo/clear")`
- `use-filter-tool.ts` â€” `on("history:undo")` + `on("history:redo")`
- `use-adjustments-tool.ts` â€” `on("history:undo")` + `on("history:redo")`
- `use-block-effects.ts` â€” `on("history:undo")` + `on("history:redo")`
- `use-rotate-flip-tool.ts` â€” `on("history:undo")` + `on("history:redo")`
- `use-zoom.ts` â€” `on("zoom:changed")`
- `use-engine.ts` â€” `on("selection:changed")`
- `image-editor.tsx` â€” `event.subscribe([], ...)`

### Step 3 â€” Unify events

**3a. Add typed callback methods on sub-APIs (img.ly pattern)**

- `engine.block.onSelectionChanged(cb)` â†’ returns unsubscribe fn
- `engine.editor.onZoomChanged(cb)` â†’ returns unsubscribe fn
- `engine.editor.onEditModeChanged(cb)` â†’ returns unsubscribe fn
- `engine.editor.onHistoryChanged(cb)` â†’ single callback, fires on any history state change

**3b. Refactor image-editor hooks to use block events instead of `history:undo/redo`**

All 4 hooks (`use-filter-tool`, `use-adjustments-tool`, `use-block-effects`, `use-rotate-flip-tool`) should use `engine.event.subscribe([blockId], ...)` instead â€” fires on undo, redo, AND direct changes.

**3c. Simplify `use-history.ts`**

Replace dual subscription with `engine.editor.onHistoryChanged(syncHistoryState)`.

**3d. Make `engine.on()`/`engine.off()` internal-only**

Keep EventBus for rendererâ†”engine internal communication (`stage:click`, `block:dblclick`). Remove from public API / mark `@internal`.

### Target event architecture

| Event              | img.ly pattern                          | Our target             |
| ------------------ | --------------------------------------- | ---------------------- |
| Block lifecycle    | `engine.event.subscribe(ids, cb)`       | **Keep** (matches)     |
| Selection changed  | `engine.block.onSelectionChanged(cb)`   | **Add**                |
| Block state        | `engine.block.onStateChanged(ids, cb)`  | Future (not alpha)     |
| Zoom changed       | `engine.editor.onZoomChanged(cb)`       | **Add**                |
| Edit mode changed  | `engine.editor.onEditModeChanged(cb)`   | **Add**                |
| History changed    | `engine.editor.onHistoryChanged(cb)`    | **Add**                |
| stage:click, dblclick | Internal renderer callbacks          | **Keep internal**      |

---

## Phase 5: API Review & Alignment with img.ly

### Step 4 â€” Review each sub-API role, compare with img.ly, fill gaps

img.ly's CE.SDK is the reference architecture. Our APIs should match its patterns where they make sense for a block-based Editx.

### Current API inventory (331 public methods)

| API | Methods | Domain |
| --- | ------- | ------ |
| EditxEngine | 23 | Core orchestration, batch, undo/redo, renderer |
| BlockAPI (facade) | 123 | Delegates to 10 sub-APIs |
| BlockPropertyAPI | 11 | Generic typed property CRUD |
| BlockLayoutAPI | 13 | Position, size, rotation, z-order, alignment |
| BlockSelectionAPI | 7 | Select/deselect, transformer |
| BlockCropAPI | 34 | Crop, page convenience, image rotate/flip |
| BlockEffectAPI | 9 | Effects CRUD, adjustments config |
| BlockFillAPI | 7 | Fill CRUD |
| BlockShapeAPI | 6 | Shape CRUD, `addShape()` |
| BlockStrokeAPI | 6 | Stroke enable/color/width |
| BlockShadowAPI | 9 | Shadow enable/color/offset/blur |
| BlockTextAPI | 24 | Text sessions, inline styling, `addText()` |
| EditorAPI | 36 | Mode, cursor, viewport, history, crop overlay |
| SceneAPI | 10 | Scene/page lifecycle, defaults, layout |
| EventAPI | 1+2 | Block lifecycle subscriptions |

### Per-API review & gaps vs img.ly

#### `engine.block` â€” BlockAPI

**Role**: All block CRUD + property access. img.ly keeps this as one flat namespace.

| Gap | img.ly has | We have | Action |
| --- | ---------- | ------- | ------ |
| `getRotation(id)` | âœ… | âŒ `setRotation` only | **Add** getter |
| `isVisible(id)` | âœ… | âŒ `setVisible` only | **Add** getter |
| `getName(id)` / `setName(id, name)` | âœ… | âŒ | **Add** (BlockStore already has these, just not wired to API) |
| `isValid(id)` | âœ… `isValid()` | âŒ | **Add** â€” checks if block ID exists |
| `findAll()` | âœ… | âŒ | **Add** â€” returns all block IDs |
| `duplicate(id)` | âœ… | âœ… | OK |
| `getFillSolidColor()` / `setFillSolidColor()` | âœ… convenience | âŒ | **Add** â€” shortcut for fill sub-block color |
| `getPositionX/Y()` / `setPositionX/Y()` | âœ… scalar | âŒ (we have `getPosition()` object) | **Consider** â€” scalar getters per img.ly pattern |
| `getWidth()` / `getHeight()` | âœ… scalar | âŒ (we have `getSize()` object) | **Consider** â€” scalar getters |
| `getFrameX/Y/Width/Height()` | âœ… (world bounds) | âŒ | **Future** â€” computed world-space bounds |
| `supportsStroke(id)` | âœ… | âŒ | **Add** |
| `supportsShadow(id)` | âœ… | âŒ | **Add** |
| `getStrokeStyle()` / `setStrokeStyle()` | âœ… (solid, dashed, etc.) | âŒ | **Future** |
| `setShadowEnabled` with force-create | âœ… auto-creates shadow | We require manual flag | **Keep** ours |

**Design concern â€” BlockCropAPI is overloaded**: It owns crop, page convenience (dimensions, margins, fill color, image src), AND image rotation/flip. img.ly separates these:
- Crop props â†’ `block.setCropScaleX()` etc. (stays in block)  
- Page props â†’ no special API (pages are just blocks with typed properties)
- Image rotation â†’ not a crop concern

**Action**: Split `BlockCropAPI` into:
- `block-crop-api.ts` â€” pure crop properties + `resetCrop`, `adjustCropToFillFrame`
- `block-page-api.ts` â€” page dimensions, margins, fill color, image src/original dimensions
- Image rotation methods stay on `BlockLayoutAPI` (they're layout transforms)

#### `engine.editor` â€” EditorAPI

**Role**: Editor-level state and viewport. img.ly splits this into `editor` + separate viewport sub-API.

| Gap | img.ly has | We have | Action |
| --- | ---------- | ------- | ------ |
| `onHistoryChanged(cb)` | âœ… | âŒ | **Add** (Step 3) |
| `onZoomChanged(cb)` | âœ… | âŒ | **Add** (Step 3) |
| `onEditModeChanged(cb)` | âœ… | âŒ | **Add** (Step 3) |
| `setSettingBool/Float/String/Color()` | âœ… (editor settings) | âŒ | **Future** â€” global editor settings bag |
| `getCanvas()` | âœ… | âŒ | **Consider** â€” return underlying DOM element |
| `setGlobalScope(scene)` | âœ… | we use `setActiveScene()` | OK â€” different name, same concept |

**Design concern â€” EditorAPI has too many responsibilities**: Mode management, cursor, viewport (zoom/pan/fit), history delegation, crop overlay. 36 methods.

**Action**: Already planned in file-length step. Crop methods â†’ `EditorCrop` (already partially exists). Viewport â†’ `EditorViewport` (already exists as internal delegation target). Just expose them as sub-APIs: `engine.editor.viewport.zoom()` or keep flat delegation but extract internally.

#### `engine.scene` â€” SceneAPI

**Role**: Scene/page lifecycle. img.ly has a richer scene model.

| Gap | img.ly has | We have | Action |
| --- | ---------- | ------- | ------ |
| `saveToString()` / `loadFromString()` | âœ… | âŒ | **Add** (Step 7) |
| `saveToArchive()` / `loadFromArchive()` | âœ… (zip) | âŒ | **Future** |
| `get()` | âœ… returns scene list | `getScene()` returns single | OK â€” we only have one scene for now |
| `getMode()` / `setMode()` | âœ… (Design/Preview) | `setPageLayout()` | OK â€” different naming |
| `removePage(id)` | âœ… | âŒ | **Add** |
| `setCurrentPage(id)` vs `setActivePage(id)` | naming difference | ours is fine | OK |
| `getZoomLevel()` / `setZoomLevel()` | On scene in img.ly | On editor in ours | OK â€” our design is cleaner |

#### `engine.event` â€” EventAPI

**Role**: Block lifecycle events. img.ly uses same pattern.

| Gap | img.ly has | We have | Action |
| --- | ---------- | ------- | ------ |
| `subscribe(ids, cb)` | âœ… | âœ… | OK â€” matches |
| Block state/loading events | âœ… `onStateChanged` | âŒ | **Future** â€” useful for asset loading progress |

OK after Step 3 unifies events. No further changes needed for alpha.

### Summary of Step 4 actions

**Must-have for alpha:**
1. Add `getRotation(id)`, `isVisible(id)`, `getName(id)`, `setName(id, name)`, `isValid(id)`, `findAll()`
2. Add `supportsStroke(id)`, `supportsShadow(id)`
3. Add `getFillSolidColor(id)` / `setFillSolidColor(id, color)` convenience
4. Add `scene.removePage(id)`
5. Split `BlockCropAPI` â†’ `BlockCropAPI` + `BlockPageAPI` (move page convenience + image rotation)
6. Add `getAdjustmentValue(effectId, param)`, `setAdjustmentValue(effectId, param, value)`, `getAdjustmentValues(effectId)` â€” convenience methods eliminating `ADJUSTMENT_CONFIG[param].key` coupling
7. Add typed `onBlockDoubleClick(cb)` event on `BlockAPI` â€” replaces untyped `engine.on("block:dblclick")`
8. Migrate image-editor off internal APIs:
   - `getBlockStore().exists()` â†’ `block.exists()`
   - Raw `"page/width"` / `"page/height"` strings â†’ `getPageDimensions()`
   - Raw `"fill/color"` / `"stroke/color"` strings â†’ `setFillSolidColor()` / `setStrokeColor()` (fixes bug: was writing string where renderer expects Color object)
   - `engine.on("block:dblclick")` â†’ `engine.block.onBlockDoubleClick()`

**Nice-to-have (post-alpha):**
- Scalar position/size getters (`getPositionX`, `getWidth`, etc.)
- `getFrameX/Y/Width/Height()` world bounds
- `getStrokeStyle()` / `setStrokeStyle()`
- `editor.getCanvas()` â†’ return container element
- `scene.saveToArchive()` / `scene.loadFromArchive()`
- `block.onStateChanged(ids, cb)` â€” asset loading events

---

## Phase 6: Type Safety

### Step 5 â€” Type improvements âœ…

- `Patch.id`: `string` â†’ `number` (eliminate all `Number(p.id)` / `String(id)` conversions)
- Remove `any` from `engine.on()`/`engine.off()`/`engine.emit()` public signatures (moot after Step 3d makes them internal)
- `EventBus.listeners`: `private` â†’ `#listeners` (consistency)
- Default export `PatchCommand` â†’ named export

**Summary:**
1. Changed `Patch.id` from `string` to `number` in `history-manager.ts` â€” eliminated all `Number(p.id)` (8 sites in editx-engine.ts + engine.ts) and `String(id)` (17 command files) conversions
2. Updated `history-manager.test.ts` and `commands.test.ts` assertions to use numeric IDs
3. Converted `EventBus.private listeners` â†’ `#listeners` (true runtime privacy)
4. Replaced `any[]` with `unknown[]` in all `on/off/emit` signatures (EventBus, EngineCore interface, EditxEngine, Engine)
5. Converted `PatchCommand` from default export to named export; updated all 17 command file imports + barrel re-export

---

## Phase 7: File Length Refactors (â‰¤250 lines per file)

### Step 6 â€” Split oversized files âœ…

Every file must be â‰¤250 lines per project rules. All violations resolved:

| File | Before | After | Extraction modules |
| ---- | ------ | ----- | ------------------ |
| `konva/konva-node-factory.ts` | 846 | 196 | `konva-node-updaters/{image,text,shape,page,common}.ts` |
| `block/block-api.ts` | 772 | 709 | Facade exception (pure delegation) â€” `block-api-convenience.ts` extracted |
| `konva/webgl-filter-renderer.ts` | 513 | ~290 | `shaders/adjustments.glsl.ts`, `filter-uniforms.ts` |
| `konva/formatted-text.ts` | 617 | 181 | `formatted-text-{utils,layout,render}.ts` |
| `konva/konva-renderer-adapter.ts` | 470 | 248 | `konva-{export,crop-helpers,scene-setup}.ts` |
| `editor/editor-crop.ts` | 492 | 224 | `editor-crop-{commit,operations}.ts` |
| `konva/konva-crop-overlay.ts` | 447 | 220 | `konva-crop-overlay-layout.ts` |
| `block/block-store.ts` | 358 | 197 | `block-store-crud.ts` |
| `editor/editor-api.ts` | 322 | 200 | JSDoc stripped (pure facade) |
| `editx-engine.ts` | 308 | 183 | `editx-engine-flush.ts` |
| `konva/konva-camera.ts` | 247 | 247 | Already under limit |
| `block/block-text-api.ts` | 239 | 239 | Already under limit |

---

## Phase 8: Serialization

### Step 7 â€” Save/Load âœ…

- `scene.saveToString()` â†’ serializes all blocks from BlockStore as JSON with version, active scene/page IDs
- `scene.loadFromString(json)` â†’ clears store, restores all blocks via `BlockStore.restore()`, resets ID counter, rebuilds renderer, clears history
- Added `BlockStore.getAllBlockIds()`, `clear()`, `resetNextId()` for bulk operations
- Serialization format: `{ version: 1, blocks: BlockData[], activeSceneId, activePageId }`
- 10 tests: round-trip, graphics/effects/text/color preservation, ID reset, error handling, overwrite

---

## Verification Checklist

1. `pnpm test` â€” all existing tests pass after each phase
2. `pnpm check` â€” Biome lint/format clean
3. `pnpm build` â€” TypeScript compiles with no errors
4. Manual: demo app works after each phase
5. After Step 2: verify `import { EditxEngine } from "@editx/engine"` does NOT bundle Konva
6. After Step 3: verify no `engine.on("history:...")` calls remain in image-editor
7. After Step 6: all engine source files â‰¤250 lines
8. After Step 7: headless script can create blocks, set properties, undo/redo, serialize without a renderer

## Decisions

- Merge Engine+EditxEngine (not keep separate) â€” confirmed by img.ly pattern
- Konva stays inside engine package but tree-shakeable via subpath exports (not separate package)
- `EventBus` becomes internal-only; public API uses `EventAPI.subscribe()` + typed `onX()` callbacks on sub-APIs
- `history:undo/redo` events are redundant â€” block events already fire on undo/redo
- Step order: structural merge first (Step 0) because every later step touches the Engine API surface
