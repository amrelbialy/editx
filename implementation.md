# Creative Editor — Implementation Plan

## Vision
A modular, extensible creative editing tool for **image, video, and templating** — inspired by img.ly / CreativeEditor SDK. Built as a monorepo with a clean engine/UI separation so the core can eventually be renderer-agnostic.

---

## Architecture Overview

```
packages/
  engine/          ← Pure TS, no React. Block-based document model + Konva renderer
  react-editor/    ← React UI consuming the engine via a bridge
  (future) video-engine/
  (future) image-engine/
```

### Engine Layer (packages/engine) — COMPLETE ✅

| File | Status |
|------|--------|
| `block/block.types.ts` — BlockData, BlockType, Color, PropertyValue | ✅ |
| `block/block-store.ts` — CRUD, hierarchy, properties, snapshot/restore | ✅ |
| `block/block-api.ts` — Public API wrapping commands | ✅ |
| `block/block-defaults.ts` — Default properties per block type | ✅ |
| `engine.ts` — Core: history, selection, event bus, batching | ✅ |
| `creative-engine.ts` — Top-level entry point, wires everything | ✅ |
| `scene.ts` — SceneAPI (create/add pages) | ✅ |
| `editor.ts` — EditorAPI (undo/redo, selection, zoom/pan) | ✅ |
| `render-adapter.ts` — RendererAdapter interface | ✅ |
| `konva-renderer-adapter.ts` — Konva renderer with transformer, drag, selection rect | ✅ |
| Commands: create-block, destroy-block, set-property, append-child, remove-child | ✅ |

Block types: `scene | page | graphic | text | image | group`

Key properties (namespaced with `/`):
- `transform/position/x`, `transform/position/y`
- `transform/size/width`, `transform/size/height`
- `transform/rotation`
- `appearance/opacity`, `appearance/visible`
- `fill/color` (Color: {r,g,b,a} normalized 0–1)
- `stroke/color`, `stroke/width`
- `text/content`, `text/fontSize`, `text/fontFamily`
- `image/src`

Engine events emitted:
- `selection:changed` (ids: number[])
- `nodes:updated` (ids: string[])
- `history:undo`, `history:redo`, `history:clear`

---

## Phase 1 (Current): React Editor Minimal Wiring

### Problem
The React layer still uses the **old** layer-based architecture:
- `editor-react-bridge.ts` — references deleted `CreativeDocument`, old `layer:*` events
- `properties-panel.tsx` — uses deleted `Layer`, `UpdateLayerCommand`
- `layer-panel.tsx` — uses deleted `Layer` type
- `creative-editor.tsx` — already updated to new engine but no UI assembled

The `editor-store.ts` is already correctly updated (uses `selectedBlockId`, not `selectedLayerId`).

### Goal: Minimal changes, get the editor rendering and interactive

### Files to update:

#### 1. `editor-react-bridge.ts` — REWRITE
Subscribe to new engine events, update zustand store:
- `selection:changed` → `setState({ selectedBlockId: ids[0] ?? null })`
- `nodes:updated` → throttled `transformTick` bump (30fps)
- Constructor takes `Engine` (not `CreativeDocument`)

#### 2. `layer-panel.tsx` — REWRITE
- Props: `{ engine: CreativeEngine }`
- List blocks from `engine.block.getChildren(pageId)`
- Click → `engine.editor.setSelection([id])`
- Highlight selected via `selectedBlockId` from store

#### 3. `properties-panel.tsx` — REWRITE
- Props: `{ engine: CreativeEngine }`
- Read `selectedBlockId` from store
- Show X, Y, W, H, rotation, opacity, fill color inputs
- Input changes → `engine.block.setFloat(id, key, val)` etc.
- Re-render on `transformTick` changes

#### 4. `creative-editor.tsx` — UPDATE
Compose full layout and wire draw tools:
```
┌─────────────────────────────────────────────┐
│  Toolbar (top bar)                          │
├──────────┬──────────────────────┬───────────┤
│  Layer   │   Canvas (Konva)     │Properties │
│  Panel   │                      │  Panel    │
│  (left)  │                      │  (right)  │
└──────────┴──────────────────────┴───────────┘
```

Draw tool handling on canvas click:
- `rectangle` → create `graphic` block (kind: `rect`) at click pos, 100×100
- `circle` → create `graphic` block (kind: `ellipse`) at click pos
- `text` → create `text` block at click pos
- After creation → switch to `select`, select new block

Wire bridge: create `EditorReactBridge` on mount, destroy on unmount.

#### 5. `editor-store.ts` — NO CHANGES NEEDED

#### Minimal engine changes required:
- `render-adapter.ts` — `onStageClick` signature: pass `worldPos: {x,y}`
- `konva-renderer-adapter.ts` — compute world position on stage click
- `creative-engine.ts` — emit `stage:click` event with world position
- `engine.ts` — add public `emit()` method

### Phase 1 Status: ✅ COMPLETE

---

## Phase 2 (Future): Feature Expansion

- **2a.** Toolbar: undo/redo buttons, zoom controls, delete selected
- **2b.** Color picker (proper, not just `<input type="color">`)
- **2c.** Image block support (upload → `image/src` property)
- **2d.** Multi-page (page thumbnails, add/switch pages)
- **2e.** Video engine (`packages/video-engine`, timeline-based)
- **2f.** Template system (export/import scene as JSON)

---

## Verification

After Phase 1 implementation:
1. `pnpm dev` — editor loads without errors
2. Canvas renders white 1080×1080 page
3. Click Rectangle tool → click canvas → rect appears
4. Click the rect → properties panel shows x/y/w/h/fill
5. Change a property → block updates on canvas
6. Undo → block reverts
7. Layer panel lists all blocks, clicking highlights on canvas
