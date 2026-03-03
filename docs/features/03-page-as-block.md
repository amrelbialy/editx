# Page-as-Block: Renderable Pages with Image Fill, Margins & Core Properties

## Overview

Make pages first-class renderable blocks with a **dual-mode rendering** strategy: when a page has `image/src` set, it renders as a `Konva.Image` with full crop support (eliminating the need for a separate child image block); otherwise it renders as a plain background rect with fill color. Add CE.SDK-aligned page properties (margins, title templates, fill/background) and scene-level dimension management. Rename `imageBlockId` → `editableBlockId` in the image-editor store since the editable target becomes the page itself.

**Reference:** [img.ly Pages Documentation](https://img.ly/docs/cesdk/js/concepts/pages-7b6bae/)

---

## Motivation

### Current problems

1. **Pages are invisible** — `syncBlock` in `konva-renderer-adapter.ts` hard-returns for `type === 'page'`. A static `Konva.Rect` (`#pageRect`) is created once in `createScene` and never updated.
2. **Redundant block hierarchy in image-editor** — The image editor creates a page, then a child image block on top of it. The page serves no purpose beyond a background rect. The base image _is_ the page.
3. **Missing CE.SDK page features** — No margins, no title templates, no page fill/background, no scene-level dimension management.

### What this plan delivers

- Pages become renderable Konva nodes with fill, image support, and margin guide overlays.
- The image editor uses the page directly as the image (page-as-image), removing the unnecessary child image block.
- CE.SDK core page properties: margins, title templates, fill/background, scene-level dimensions.
- Data model for layout modes (no visual layout rendering yet).

---

## Architecture: Before & After

### Before (current)

```
Scene (block, id=1) ── NOT rendered
  └── Page (block, id=2) ── NOT rendered, static #pageRect background
       └── Image (block, id=3) ── Konva.Image node, crop target
```

- `syncBlock` skips `page` and `scene` types entirely
- `#pageRect` is a one-time `Konva.Rect` created in `createScene`, never synced
- Image editor stores `imageBlockId` pointing to the child image block (id=3)
- Crop mode targets the child image block

### After (planned)

```
Scene (block, id=1) ── NOT rendered (still structural)
  └── Page (block, id=2) ── Konva.Group (background rect + margin overlay)
                           ── When image/src is set: Konva.Image with crop support
                           ── When image/src is empty: Konva.Rect with fill color
```

- `syncBlock` renders pages through `KonvaNodeFactory`
- `#pageRect` is removed — the page's Konva group handles background
- Image editor stores `editableBlockId` pointing to the page (id=2)
- Crop mode targets the page directly
- No separate child image block needed for the image-editor use case

---

## Dual-Mode Page Rendering

The page block has two visual modes determined by its `image/src` property:

| `image/src` value | Rendering                             | Crop support | Use case                         |
| ----------------- | ------------------------------------- | ------------ | -------------------------------- |
| Empty string `''` | `Konva.Rect` with `fill/color`        | No           | Design editor, plain backgrounds |
| Non-empty URL     | `Konva.Image` with full crop pipeline | Yes          | Image editor, photo backgrounds  |

Both modes are wrapped in a `Konva.Group` that also contains an optional margin-guide overlay.

---

## Implementation Steps

### Step 1 — Extend page property keys

**File:** `packages/engine/src/block/property-keys.ts`

Add new constants:

```
// Page margins
PAGE_MARGIN_ENABLED    = 'page/marginEnabled'
PAGE_MARGIN_TOP        = 'page/margin/top'
PAGE_MARGIN_BOTTOM     = 'page/margin/bottom'
PAGE_MARGIN_LEFT       = 'page/margin/left'
PAGE_MARGIN_RIGHT      = 'page/margin/right'

// Page title
PAGE_TITLE_TEMPLATE    = 'page/titleTemplate'

// Scene-level dimensions
SCENE_PAGE_DIMS_WIDTH  = 'scene/pageDimensions/width'
SCENE_PAGE_DIMS_HEIGHT = 'scene/pageDimensions/height'
SCENE_ASPECT_RATIO_LOCK = 'scene/aspectRatioLock'
SCENE_LAYOUT           = 'scene/layout'
```

No new keys needed for page image support — reuse existing `IMAGE_SRC` and all 12 `CROP_*` keys (they are block-agnostic string constants).

---

### Step 2 — Update block defaults for dual-mode page

**File:** `packages/engine/src/block/block-defaults.ts`

Current page defaults (~line 37–41):

```ts
page: {
    [PAGE_WIDTH]: 1080,
    [PAGE_HEIGHT]: 1080,
    [FILL_COLOR]: { r: 1, g: 1, b: 1, a: 1 },
}
```

New page defaults:

```ts
page: {
    [PAGE_WIDTH]: 1080,
    [PAGE_HEIGHT]: 1080,
    [FILL_COLOR]: { r: 1, g: 1, b: 1, a: 1 },
    // Appearance
    [OPACITY]: 1,
    [VISIBLE]: true,
    // Image fill (dual-mode: empty = color rect, non-empty = Konva.Image)
    [IMAGE_SRC]: '',
    // Crop properties (active when IMAGE_SRC is set)
    [CROP_X]: 0, [CROP_Y]: 0,
    [CROP_WIDTH]: 0, [CROP_HEIGHT]: 0,
    [CROP_ENABLED]: false,
    [CROP_SCALE_X]: 1, [CROP_SCALE_Y]: 1,
    [CROP_ROTATION]: 0,
    [CROP_SCALE_RATIO]: 1,
    [CROP_FLIP_HORIZONTAL]: false, [CROP_FLIP_VERTICAL]: false,
    [CROP_ASPECT_RATIO_LOCKED]: false,
    // Margins
    [PAGE_MARGIN_ENABLED]: false,
    [PAGE_MARGIN_TOP]: 0,
    [PAGE_MARGIN_BOTTOM]: 0,
    [PAGE_MARGIN_LEFT]: 0,
    [PAGE_MARGIN_RIGHT]: 0,
    // Title
    [PAGE_TITLE_TEMPLATE]: 'Page {{page_index}}',
}
```

New scene defaults additions:

```ts
scene: {
    [SCENE_WIDTH]: 1080,
    [SCENE_HEIGHT]: 1080,
    [SCENE_PAGE_DIMS_WIDTH]: 1080,
    [SCENE_PAGE_DIMS_HEIGHT]: 1080,
    [SCENE_ASPECT_RATIO_LOCK]: false,
    [SCENE_LAYOUT]: 'Free',
}
```

---

### Step 3 — Add `PageLayoutMode` type

**File:** `packages/engine/src/block/block.types.ts`

```ts
export type PageLayoutMode =
  | "VerticalStack"
  | "HorizontalStack"
  | "DepthStack"
  | "Free";
```

No changes to the `BlockType` union (`page` already exists).

---

### Step 4 — Update `hasCrop` / `supportsCrop` in BlockAPI

**File:** `packages/engine/src/block/block-api.ts` (~line 228–234)

Current:

```ts
hasCrop(id: number): boolean {
    return this.getType(id) === 'image';
}
supportsCrop(id: number): boolean {
    return this.getType(id) === 'image';
}
```

Change to:

```ts
supportsCrop(id: number): boolean {
    const type = this.getType(id);
    return type === 'image' || type === 'page';
}
hasCrop(id: number): boolean {
    return this.supportsCrop(id) && this.getBool(id, CROP_ENABLED);
}
```

All existing crop property accessors (`setCropScaleX`, `resetCrop`, `adjustCropToFillFrame`, etc.) are generic `setFloat`/`getFloat` calls and work unchanged on page blocks once the properties exist.

---

### Step 5 — Update EditorAPI `#setupCropOverlay` for page dimensions

**File:** `packages/engine/src/editor.ts` (~line 114–142)

`#setupCropOverlay` currently reads `SIZE_WIDTH` / `SIZE_HEIGHT` to compute `imageRect`. Add a branch:

```ts
const blockType = this.#blockApi.getType(blockId);
const imgW =
  blockType === "page"
    ? store.getFloat(blockId, PAGE_WIDTH)
    : store.getFloat(blockId, SIZE_WIDTH);
const imgH =
  blockType === "page"
    ? store.getFloat(blockId, PAGE_HEIGHT)
    : store.getFloat(blockId, SIZE_HEIGHT);
```

Everything downstream (`commitCrop`, `applyCropRatio`) is already block-type-agnostic.

---

### Step 6 — Remove hard skip for pages in `syncBlock`

**File:** `packages/engine/src/konva/konva-renderer-adapter.ts` (~line 117–118)

Current:

```ts
if (block.type === "scene" || block.type === "page") return;
```

Change to:

```ts
if (block.type === "scene") return;
```

Page blocks now flow through to `KonvaNodeFactory` for node creation/update.

---

### Step 7 — Add page node creation in `KonvaNodeFactory`

**File:** `packages/engine/src/konva/konva-node-factory.ts`

In `createNode` (~line 36–88), add a `page` branch:

```ts
if (block.type === "page") {
  const group = new Konva.Group({ name: `page-${id}`, draggable: false });

  const imageSrc = block.properties[IMAGE_SRC] as string;
  if (imageSrc) {
    // Image mode: Konva.Image inside the group
    const imgNode = new Konva.Image({
      name: `page-bg-${id}`,
      image: undefined,
    });
    group.add(imgNode);
  } else {
    // Color mode: Konva.Rect with fill color
    const rect = new Konva.Rect({ name: `page-bg-${id}`, listening: false });
    group.add(rect);
  }

  // Margin overlay (dashed rect, hidden by default)
  const marginOverlay = new Konva.Rect({
    name: `page-margin-${id}`,
    stroke: "#ff6b6b",
    strokeWidth: 1,
    dash: [6, 4],
    fill: "transparent",
    listening: false,
    visible: false,
  });
  group.add(marginOverlay);

  node = group;
}
```

In `updateNode` (~line 90–115), add page dispatching:

- If page has `IMAGE_SRC` → find the `Konva.Image` child, delegate to `#updateImageNode` (same crop/flip logic as image blocks)
- If no `IMAGE_SRC` → find the `Konva.Rect` child, update fill color + width + height
- Always update margin overlay visibility/geometry from `page/marginEnabled` and margin values

**Mode switching:** If `IMAGE_SRC` changes from empty ↔ non-empty, destroy the old background child and create the right type. This handles runtime mode switches.

---

### Step 8 — Replace static `#pageRect` with dynamic page node

**File:** `packages/engine/src/konva/konva-renderer-adapter.ts`

- Remove the `#pageRect` field (~line 21)
- Remove the static `Konva.Rect` creation in `createScene` (~line 43–69)
- After creating the scene, call `syncBlock` for the page block so it gets a proper Konva node through the new pipeline
- Update `fitToScreen` to read page dimensions from the page block in the node map instead of from the removed `#pageRect`

---

### Step 9 — Add page-specific convenience methods to BlockAPI

**File:** `packages/engine/src/block/block-api.ts`

New methods (all throw if `getType(id) !== 'page'`):

| Method                                                         | Description                                               |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| `setPageMargins(id, { top, right, bottom, left })`             | Batch-set all four margins + enable `page/marginEnabled`  |
| `getPageMargins(id)` → `{ enabled, top, right, bottom, left }` | Read margin state                                         |
| `setPageTitle(id, template: string)`                           | Set `page/titleTemplate`                                  |
| `getPageTitle(id)` → `string`                                  | Resolve `{{page_index}}` from sibling position            |
| `setPageFill(id, color: Color)`                                | Set `fill/color`, clear `IMAGE_SRC` (explicit color mode) |
| `setPageImage(id, src: string)`                                | Set `IMAGE_SRC` on the page (image mode)                  |
| `isPageImageMode(id)` → `boolean`                              | Check if `IMAGE_SRC` is non-empty                         |

---

### Step 10 — Update SceneAPI for scene-level dimensions

**File:** `packages/engine/src/scene.ts`

New methods:

| Method                                      | Description                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `setPageDimensions(width, height)`          | Set `scene/pageDimensions/width` and `height` on scene block; optionally propagate to all existing pages |
| `getPageDimensions()` → `{ width, height }` | Read scene-level page dimensions                                                                         |
| `setAspectRatioLock(locked)`                | Set `scene/aspectRatioLock`                                                                              |
| `getAspectRatioLock()` → `boolean`          | Read lock state                                                                                          |
| `setLayoutMode(mode)` / `getLayoutMode()`   | Get/set `scene/layout` (data model only, no visual layout yet)                                           |

Update `addPage` (~line 56–70):

- Inherit scene-level page dimensions as defaults
- Call `syncBlock` on the renderer so new pages get Konva nodes
- Optionally set it as active page

Update `create`:

- Set new scene-level default properties
- Use the `syncBlock` pipeline for the initial page instead of the ad-hoc `#pageRect`

---

### Step 11 — Add page-related commands for undo/redo

**Directory:** `packages/engine/src/controller/commands/`

| Command                 | Description                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `SetPageMarginsCommand` | Batch-sets four margin properties + enabled flag, produces patches                      |
| `SetPageImageCommand`   | Sets `IMAGE_SRC` on a page block, produces patches (allows undo of page-as-image setup) |

These wrap `SetPropertyCommand` calls in a batch for atomic undo.

---

### Step 12 — Rename `imageBlockId` → `editableBlockId` in image-editor

**File:** `packages/image-editor/src/store/image-editor-store.ts`

- Rename state: `imageBlockId` → `editableBlockId`
- Rename action: `setImageBlockId` → `setEditableBlockId`

**File:** `packages/image-editor/src/image-editor.tsx`

Update all 7 usage sites:

| Line | Before                     | After                        |
| ---- | -------------------------- | ---------------------------- |
| ~86  | `s.setImageBlockId`        | `s.setEditableBlockId`       |
| ~95  | `s.imageBlockId`           | `s.editableBlockId`          |
| ~248 | `setImageBlockId(blockId)` | `setEditableBlockId(pageId)` |
| ~291 | `setImageBlockId` in deps  | `setEditableBlockId` in deps |
| ~380 | `imageBlockId === null`    | `editableBlockId === null`   |
| ~383 | `blockId: imageBlockId`    | `blockId: editableBlockId`   |
| ~388 | `imageBlockId` in deps     | `editableBlockId` in deps    |

---

### Step 13 — Refactor image-editor `initEditor` to use page-as-image

**File:** `packages/image-editor/src/image-editor.tsx` (~line 241–248)

**Before:**

```ts
const blockId = ce.block.create("image");
ce.block.setString(blockId, IMAGE_SRC, workingUrl);
ce.block.setSize(blockId, workingWidth, workingHeight);
ce.block.setPosition(blockId, 0, 0);
ce.block.appendChild(pageId, blockId);
setImageBlockId(blockId);
```

**After:**

```ts
// Set image directly on the page — no child block needed
ce.block.setString(pageId, IMAGE_SRC, workingUrl);
setEditableBlockId(pageId);
```

The page already has the correct dimensions from `scene.create()`. No child block creation, no `appendChild`. The page IS the image. Crop mode entry passes the page id:

```ts
ce.editor.setEditMode("Crop", { blockId: editableBlockId });
```

---

### Step 14 — Update and add tests

| Test file                                                | What to test                                                                                                                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/engine/src/scene.test.ts`                      | Page creation with margins/title/fill, scene-level page dimensions, `addPage` with renderer sync                                                                                              |
| `packages/engine/src/__tests__/page-block.test.ts` (new) | `setPageMargins`/`getPageMargins` round-trip, title template resolution, `setPageImage`/`isPageImageMode`, crop operations on a page block, `hasCrop`/`supportsCrop` returning true for pages |
| `packages/engine/src/editor.test.ts`                     | `setEditMode('Crop', { blockId: pageId })` when page has `IMAGE_SRC` — verify `#setupCropOverlay` reads `PAGE_WIDTH`/`PAGE_HEIGHT`                                                            |
| `packages/engine/src/engine.test.ts`                     | Undo/redo of page property changes                                                                                                                                                            |
| `packages/image-editor/src/image-editor.test.tsx`        | Verify no child image block is created, verify page block has `IMAGE_SRC` set, verify crop mode targets the page                                                                              |

---

## Verification Checklist

- [ ] `pnpm turbo test` — all existing + new tests pass
- [ ] Open demo app → load an image → verify it renders as the page background (not as a child block)
- [ ] Enter crop mode → verify crop overlay appears correctly over the page image
- [ ] Apply crop → verify crop properties are written to the page block and the canvas updates
- [ ] Undo crop → verify crop reverts on the page block
- [ ] Create a scene without an image (programmatically) → verify page renders as a plain color rect
- [ ] Set `page/marginEnabled: true` + margin values → verify dashed overlay guides appear
- [ ] Change page fill color via `block.setColor(pageId, ...)` → verify canvas background updates in real time

---

## Key Decisions

| Decision                                                | Rationale                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Dual-mode page, not a new block kind**                | Page renders as `Konva.Image` when `IMAGE_SRC` is non-empty, as `Konva.Rect` when empty. Avoids type proliferation; matches CE.SDK's fill model. |
| **Reuse `IMAGE_SRC` and `CROP_*` keys**                 | No page-specific duplicates. Property key constants are just strings; they work on any block type that has them in its defaults.                 |
| **`editableBlockId` replaces `imageBlockId`**           | Future-proofs the store for when the editable target could be any block type.                                                                    |
| **Page Konva node is `Konva.Group`**                    | Wraps background (rect or image) + margin overlay. Allows composition and clean toggling without affecting background rendering.                 |
| **Scene layout mode is data-only**                      | `setLayoutMode` stores the value but no visual layout engine exists yet. Multi-page rendering is a separate future effort.                       |
| **`#pageRect` fully removed**                           | The page's Konva group handles this. Single source of truth for page dimensions and fill.                                                        |
| **Margin guides are overlays, not clipping boundaries** | Dashed-stroke rects for the designer to see. Don't clip or constrain child blocks. Matches CE.SDK's print-bleed semantics.                       |

---

## Files Modified (Summary)

| File                                                    | Change                                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| `packages/engine/src/block/property-keys.ts`            | Add margin, title, scene-level dimension keys                             |
| `packages/engine/src/block/block-defaults.ts`           | Add image/crop/margin/title defaults to page; scene-level defaults        |
| `packages/engine/src/block/block.types.ts`              | Add `PageLayoutMode` type                                                 |
| `packages/engine/src/block/block-api.ts`                | Update `hasCrop`/`supportsCrop`; add page convenience methods             |
| `packages/engine/src/editor.ts`                         | Branch `#setupCropOverlay` for page dimensions                            |
| `packages/engine/src/konva/konva-renderer-adapter.ts`   | Remove page skip in `syncBlock`; remove `#pageRect`; update `fitToScreen` |
| `packages/engine/src/konva/konva-node-factory.ts`       | Add page node creation + update dispatching                               |
| `packages/engine/src/scene.ts`                          | Add scene-level dimension/layout methods; update `create`/`addPage`       |
| `packages/engine/src/controller/commands/`              | Add `SetPageMarginsCommand`, `SetPageImageCommand`                        |
| `packages/image-editor/src/store/image-editor-store.ts` | Rename `imageBlockId` → `editableBlockId`                                 |
| `packages/image-editor/src/image-editor.tsx`            | Use page-as-image; rename selectors; remove child image block creation    |
| Test files (multiple)                                   | New and updated tests for all changes                                     |

---

## Out of Scope (Future Work)

- Multi-page rendering (multiple pages visible on canvas simultaneously)
- Layout engine for VerticalStack / HorizontalStack / DepthStack
- Video mode / playback properties on pages
- Page reordering UI
- Page thumbnails / navigation panel
