# Editx â€” Changelog

---

## EventAPI: IMG.LY-Style Block Lifecycle Events

**Date:** 2026-02-23

### Problem

The React hooks were subscribing to a generic `nodes:updated` event on the EventBus and manually filtering by block ID in the React layer. This meant:
- Filtering logic lived in React, not the engine
- No distinction between created/updated/destroyed events
- Events fired inline during command execution, not bundled at end of cycle
- Every subscriber received every event and had to do its own filtering

### Inspiration

IMG.LY CE.SDK has an `EventAPI` ([docs](https://img.ly/docs/cesdk/js/api/engine/classes/eventapi/)) where you subscribe to specific block IDs and receive typed, bundled events at the end of each engine update cycle.

### Solution

Added an `EventAPI` class to the engine that follows the IMG.LY pattern. Events are now:
- **Typed**: `created`, `updated`, `destroyed`
- **Filtered at the engine level**: subscribe to specific block IDs or all blocks
- **Bundled**: events are collected during execution and delivered once at the end of the update cycle (after render flush)
- **Deduplicated**: if a block has multiple events in one cycle, only the most significant is delivered

### What Changed

#### Created

- **`packages/engine/src/event-api.ts`** â€” New `EventAPI` class:
  - `subscribe(blocks, callback)` â€” subscribe to block lifecycle events
    - `blocks: number[]` â€” filter by block IDs. Empty array = all blocks
    - `callback: (events: BlockEvent[]) => void` â€” receives bundled events
    - Returns `() => void` unsubscribe function
  - Events: `{ type: 'created' | 'updated' | 'destroyed', block: number }`
  - Internal `_enqueue()` and `_flush()` methods called by Engine

#### Modified

- **`packages/engine/src/engine.ts`**
  - Added `EventAPI` instance, exposed via `engine.event` getter
  - `exec()` and `endBatch()` now enqueue typed block events from patches
  - `#flush()` calls `eventApi._flush()` AFTER render â€” events arrive at end of update cycle
  - `#applyPatches()` (undo/redo) also enqueues events
  - `#enqueueBlockEvents()` â€” new private method that reads patch before/after to determine event type:
    - `before === null` â†’ `created`
    - `after === null` â†’ `destroyed`
    - both present â†’ `updated`
  - Removed inline `nodes:updated` emission (replaced by EventAPI)

- **`packages/engine/src/editx-engine.ts`**
  - Exposes `event: EventAPI` as a public property

- **`packages/engine/src/index.ts`**
  - Exports `EventAPI` class and `BlockEvent`, `BlockEventType` types

- **`packages/react-editor/src/hooks/use-engine.ts`**
  - All block hooks now use `engine.event.subscribe([blockId], callback)` instead of raw `engine.core.on('nodes:updated', ...)`
  - `useBlockChildren` uses `engine.event.subscribe([], callback)` (all blocks)
  - `useSelection` still uses legacy EventBus (selection is not a block lifecycle event)
  - Fixed infinite loop bug: added `arraysEqual` / `colorsEqual` helpers for stable snapshot references

### How It Works Now

```
1. User drags block 5
2. Engine executes SetPropertyCommand
3. Command returns Patch â†’ engine calls eventApi._enqueue({ type: 'updated', block: 5 })
4. Engine flushes dirty blocks to renderer (Konva redraws)
5. Engine calls eventApi._flush():
   - Deduplicates events
   - Subscriber for [5] receives: [{ type: 'updated', block: 5 }]
   - Subscriber for [12] receives: nothing (block 12 not in event list)
   - Subscriber for [] (all) receives: [{ type: 'updated', block: 5 }]
6. React hook callback fires â†’ getSnapshot() â†’ re-render if value changed
```

### Event Delivery Timing

Events are delivered AFTER the renderer flush. This means when your callback fires, the canvas is already up to date. This prevents UI flickering where React would try to read stale engine state.

### Legacy EventBus

The old `engine.core.on()` / `engine.core.off()` / `engine.core.emit()` still exists for non-block events like `selection:changed`, `stage:click`, and `history:undo/redo/clear`. The `nodes:updated` event has been removed in favor of EventAPI.

---

## Bridge Refactor: useSyncExternalStore Hooks

**Date:** 2026-02-20

### Problem

The previous engine-to-React communication used a `transformTick` counter in Zustand. Any block change anywhere incremented this global counter, causing every subscribed component to re-render and re-read all values from the engine â€” even if the change was irrelevant to that component.

### Solution

Replaced the `EditorReactBridge` class and `transformTick` pattern with React 18 `useSyncExternalStore` hooks that subscribe directly to engine events with fine-grained filtering.

### What Changed

#### Created

- **`packages/react-editor/src/hooks/use-engine.ts`** â€” 9 hooks:
  - `useSelection(engine)` â€” subscribes to `selection:changed`, returns `number[]`
  - `useSelectedBlockId(engine)` â€” convenience wrapper, returns first selected ID or `null`
  - `useBlockFloat(engine, blockId, key)` â€” subscribes to `nodes:updated` filtered by blockId
  - `useBlockString(engine, blockId, key)` â€” same pattern for string properties
  - `useBlockBool(engine, blockId, key)` â€” same pattern for boolean properties
  - `useBlockColor(engine, blockId, key)` â€” same pattern for Color properties
  - `useBlockChildren(engine, blockId)` â€” subscribes to all `nodes:updated` (for list changes)
  - `useBlockType(engine, blockId)` â€” block type
  - `useBlockKind(engine, blockId)` â€” block kind/sub-type

#### Modified

- **`packages/react-editor/src/store/editor-store.ts`**
  - Removed: `selectedBlockId`, `zoom`, `transformTick`, `setSelectedBlock`, `setZoom`
  - Kept: `activeTool`, `sidebarOpen`, `setActiveTool`, `toggleSidebar`
  - Zustand now holds only pure UI state that doesn't exist in the engine

- **`packages/react-editor/src/components/properties-panel.tsx`**
  - Replaced `useEditorStore(s => s.transformTick)` with `useSelectedBlockId` + `useBlockFloat` / `useBlockColor` hooks
  - Split into `PropertiesPanel` (selection gate) and `BlockProperties` (property display) so hooks are only called when a block is selected

- **`packages/react-editor/src/components/layer-panel.tsx`**
  - Replaced `useEditorStore(s => s.transformTick)` and `useEditorStore(s => s.selectedBlockId)` with `useSelectedBlockId` + `useBlockChildren` hooks

- **`packages/react-editor/src/components/editx.tsx`**
  - Removed `EditorReactBridge` creation and cleanup
  - Removed `bridgeRef`

- **`packages/react-editor/src/index.ts`**
  - Added exports for all 9 hooks

#### Deleted

- **`packages/react-editor/src/editor-react-bridge.ts`** â€” no longer needed

### How It Works Now

```
Engine emits 'nodes:updated' with block IDs â†’ ['5', '12']
  â†“
useBlockFloat(engine, 5, 'transform/position/x')
  â†’ checks: is '5' in the ID list? YES â†’ calls getSnapshot()
  â†’ React compares old vs new value â†’ re-renders only if different

useBlockFloat(engine, 7, 'fill/color')
  â†’ checks: is '7' in the ID list? NO â†’ does nothing
```

### No Engine Changes

The engine package was not modified. All hooks use the existing `nodes:updated` and `selection:changed` events.
