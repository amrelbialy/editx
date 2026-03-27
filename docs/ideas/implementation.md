# Editx â€” Implementation Plan

## Vision
A modular, extensible creative editing tool for **image, video, and templating** â€” inspired by img.ly / CreativeEditor SDK. Built as a monorepo with a clean engine/UI separation so the core can eventually be renderer-agnostic.

---

## Architecture Overview

```
packages/
  engine/          â† Pure TS, no React. Block-based document model + Konva renderer
  react-editor/    â† React UI consuming the engine via a bridge
  (future) video-engine/
  (future) image-engine/
```

### Engine Layer (packages/engine) â€” COMPLETE âœ…

| File | Status |
|------|--------|
| `block/block.types.ts` â€” BlockData, BlockType, Color, PropertyValue | âœ… |
| `block/block-store.ts` â€” CRUD, hierarchy, properties, snapshot/restore | âœ… |
| `block/block-api.ts` â€” Public API wrapping commands | âœ… |
| `block/block-defaults.ts` â€” Default properties per block type | âœ… |
| `engine.ts` â€” Core: history, selection, event bus, batching | âœ… |
| `editx-engine.ts` â€” Top-level entry point, wires everything | âœ… |
| `scene.ts` â€” SceneAPI (create/add pages) | âœ… |
| `editor.ts` â€” EditorAPI (undo/redo, selection, zoom/pan) | âœ… |
| `render-adapter.ts` â€” RendererAdapter interface | âœ… |
| `konva-renderer-adapter.ts` â€” Konva renderer with transformer, drag, selection rect | âœ… |
| Commands: create-block, destroy-block, set-property, append-child, remove-child | âœ… |

Block types: `scene | page | graphic | text | image | group`

Key properties (namespaced with `/`):
- `transform/position/x`, `transform/position/y`
- `transform/size/width`, `transform/size/height`
- `transform/rotation`
- `appearance/opacity`, `appearance/visible`
- `fill/color` (Color: {r,g,b,a} normalized 0â€“1)
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
- `editor-react-bridge.ts` â€” references deleted `CreativeDocument`, old `layer:*` events
- `properties-panel.tsx` â€” uses deleted `Layer`, `UpdateLayerCommand`
- `layer-panel.tsx` â€” uses deleted `Layer` type
- `editx.tsx` â€” already updated to new engine but no UI assembled

The `editor-store.ts` is already correctly updated (uses `selectedBlockId`, not `selectedLayerId`).

### Goal: Minimal changes, get the editor rendering and interactive

### Files to update:

#### 1. `editor-react-bridge.ts` â€” REWRITE
Subscribe to new engine events, update zustand store:
- `selection:changed` â†’ `setState({ selectedBlockId: ids[0] ?? null })`
- `nodes:updated` â†’ throttled `transformTick` bump (30fps)
- Constructor takes `Engine` (not `CreativeDocument`)

#### 2. `layer-panel.tsx` â€” REWRITE
- Props: `{ engine: EditxEngine }`
- List blocks from `engine.block.getChildren(pageId)`
- Click â†’ `engine.editor.setSelection([id])`
- Highlight selected via `selectedBlockId` from store

#### 3. `properties-panel.tsx` â€” REWRITE
- Props: `{ engine: EditxEngine }`
- Read `selectedBlockId` from store
- Show X, Y, W, H, rotation, opacity, fill color inputs
- Input changes â†’ `engine.block.setFloat(id, key, val)` etc.
- Re-render on `transformTick` changes

#### 4. `editx.tsx` â€” UPDATE
Compose full layout and wire draw tools:
```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  Toolbar (top bar)                          â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚  Layer   â”‚   Canvas (Konva)     â”‚Properties â”‚
â”‚  Panel   â”‚                      â”‚  Panel    â”‚
â”‚  (left)  â”‚                      â”‚  (right)  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Draw tool handling on canvas click:
- `rectangle` â†’ create `graphic` block (kind: `rect`) at click pos, 100Ã—100
- `circle` â†’ create `graphic` block (kind: `ellipse`) at click pos
- `text` â†’ create `text` block at click pos
- After creation â†’ switch to `select`, select new block

Wire bridge: create `EditorReactBridge` on mount, destroy on unmount.

#### 5. `editor-store.ts` â€” NO CHANGES NEEDED

#### Minimal engine changes required:
- `render-adapter.ts` â€” `onStageClick` signature: pass `worldPos: {x,y}`
- `konva-renderer-adapter.ts` â€” compute world position on stage click
- `editx-engine.ts` â€” emit `stage:click` event with world position
- `engine.ts` â€” add public `emit()` method

### Phase 1 Status: âœ… COMPLETE

---

## Phase 2 (Future): Feature Expansion

- **2a.** Toolbar: undo/redo buttons, zoom controls, delete selected
- **2b.** Color picker (proper, not just `<input type="color">`)
- **2c.** Image block support (upload â†’ `image/src` property)
- **2d.** Multi-page (page thumbnails, add/switch pages)
- **2e.** Video engine (`packages/video-engine`, timeline-based)
- **2f.** Template system (export/import scene as JSON)

---

## Verification

After Phase 1 implementation:
1. `pnpm dev` â€” editor loads without errors
2. Canvas renders white 1080Ã—1080 page
3. Click Rectangle tool â†’ click canvas â†’ rect appears
4. Click the rect â†’ properties panel shows x/y/w/h/fill
5. Change a property â†’ block updates on canvas
6. Undo â†’ block reverts
7. Layer panel lists all blocks, clicking highlights on canvas
