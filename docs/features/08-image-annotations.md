# Feature 8: Image Annotations — Overlay Images & Sticker Gallery

**Status:** not started

## TL;DR

Add image overlay annotations — users upload images or pick from a preset gallery to place on the canvas as draggable, resizable, rotatable overlays. Image annotations reuse the existing `image` block type (same as the base layer image), rendered via `Konva.Image`, with full transform/selection/z-order support. The UI combines a drag-and-drop upload zone with an optional sticker/image gallery configured by the host app.

## User Story

As a user, I click the **Image** tool in the toolbar. A side panel appears with:
1. A drag-and-drop upload zone (or click-to-browse)
2. An optional gallery of preset images/stickers (if configured)

I upload an image or pick one from the gallery. The image appears centered on the canvas at ~40% of the shortest page side, auto-selected with transform handles visible. I can then move, resize, rotate, adjust opacity, apply effects, reorder layers, or replace the image source. Each change is an undo step.

## Scenarios

### Upload an image overlay

1. User clicks "Image" in the toolbar
2. Side panel shows upload zone with drag-and-drop area and "Upload" button
3. User drags a PNG file onto the upload zone
4. Image appears centered on the canvas, auto-selected
5. Transform handles are visible (resize, rotate)

### Pick from gallery

1. User clicks "Image" in the toolbar
2. Side panel shows upload zone + gallery grid of preset images (stickers, logos, etc.)
3. User clicks a sticker thumbnail → sticker is placed on canvas, centered, auto-selected
4. Gallery items are configured by the host app via `image.gallery` config

### Move and resize

1. User drags the image overlay to a new position
2. User drags a corner handle to resize (preserves aspect ratio by default)
3. User drags rotation handle to rotate
4. Each transform is a separate undo step

### Replace image source

1. User selects an existing image overlay
2. In the property bar, user clicks "Replace"
3. File picker opens → user selects a new image
4. Image source updates, dimensions adjust to new aspect ratio
5. Change is a single undo step

### Adjust overlay properties

1. User selects an image overlay
2. User adjusts opacity slider → overlay becomes semi-transparent
3. User adds a drop shadow via shadow property panel
4. Each change is a separate undo step

### Apply effects to overlay

1. User selects an image overlay
2. User switches to Adjust tool → adjustments apply to the selected overlay (not the base image)
3. User switches to Filter tool → filter presets apply to the selected overlay
4. Effects are stored as effect sub-blocks on the image block

### Reorder layers

1. User places multiple image overlays
2. User right-clicks an overlay → "Bring Forward" / "Send Backward" / "Bring to Front" / "Send to Back"
3. Z-order updates immediately

### Delete overlay

1. User selects an image overlay on canvas
2. User presses Delete → overlay is destroyed
3. Undo restores the overlay with all its properties and effects

### Compose with other annotations

1. User loads a base image (Feature 1), crops it (Feature 2)
2. User places a shape annotation (Feature 6) and a text annotation (Feature 7)
3. User places an image overlay (Feature 8)
4. All annotations render correctly with proper z-order
5. Undo/redo works across all annotation types

## Reference Analysis

### img.ly CE.SDK — Image Blocks

In CE.SDK, image overlays are graphic blocks with an image fill:

```
graphic block (type='graphic')
  ├── shape sub-block (type='shape', kind='rect')     → bounding geometry
  ├── fill sub-block  (type='fill', kind='image')      → image source
  └── effects[]                                         → filters
```

Key APIs:
- `block.create('graphic')` — create container
- `block.createFill('image')` → set URI via `fill/image/imageFileURI`
- `block.setFloat(id, 'fill/image/sourceWidth', w)` / `sourceHeight`
- `block.setContentFillMode(id, 'Cover' | 'Contain' | 'Crop')`

### Filerobot — Image Annotation

Filerobot treats image annotations as a tool type:

- **Config:** `{ disableUpload: false, gallery: [{ originalUrl, previewUrl }], fill: undefined }`
- **Gallery:** Array of `{ originalUrl: string, previewUrl: string }` items — previewUrl for thumbnails, originalUrl for canvas placement
- **Placement:** Auto-centered with 15% padding from edges, preserving aspect ratio
- **Rendering:** `Konva.Image` node with `loadImage()` + CORS handling
- **Controls:** Opacity, stroke, strokeWidth, shadow properties (shared `annotationsCommon`)

### What Already Exists in Our Codebase

- ✅ `BlockType = 'image'` — first-class block type in `block.types.ts`
- ✅ Image properties: `IMAGE_SRC`, `IMAGE_ORIGINAL_WIDTH`, `IMAGE_ORIGINAL_HEIGHT`, `IMAGE_ROTATION` in `property-keys.ts`
- ✅ Image defaults in `block-defaults.ts` (position, size, opacity, crop, etc.)
- ✅ `block.addImage(parentId, src, x, y, w, h, origW, origH)` in `block-api.ts` — creates image block as child of page
- ✅ Konva renderer handles `image` type — creates `Konva.Image`, loads async, applies crop/flip/filters
- ✅ Image loading utility with cache in `utils/image-loader.ts`
- ✅ Filter/adjustment pipeline works on image nodes (`#applyFilters()`)
- ✅ `ImageEditorTool = 'image'` in store — tool type registered
- ✅ Tool sidebar includes "Image" with `ImagePlus` icon in annotation group
- ✅ `ImagePanel` component — drag-and-drop upload zone with file validation
- ✅ `useImageTool` hook — `handleAddImage(file)` reads file, downscales, calls `addImage()`, auto-selects
- ✅ `handleReplaceImage(file, blockId)` — replaces source on existing block
- ✅ Transform handles, selection, z-order, delete all work on image blocks
- ✅ `ImageToolConfig` — `maxFileSize`, `maxDimension` configuration
- ✅ Undo/redo for all block operations via command system

### What's Missing

- ❌ **Gallery UI** — No preset image/sticker gallery component
- ❌ **Gallery config** — No `gallery: Array<{ originalUrl, previewUrl }>` in `ImageToolConfig`
- ❌ **Gallery item placement** — No `handleAddGalleryImage(item)` that loads from URL instead of File
- ❌ **Image-specific property controls** — No dedicated property panel for selected image overlays (replace button, crop-to-fit, aspect ratio lock)
- ❌ **Replace image action** — `handleReplaceImage` exists in hook but no UI trigger (button in property bar or context menu)
- ❌ **Tests** — No test coverage for image annotation workflows
- ❌ **Doc** — This document

---

## Architecture

### Block Model

Image annotations reuse the existing `image` block type — no new block types needed:

```
page (type='page')
  ├── image (type='image')          → base layer image (Feature 1)
  ├── graphic (type='graphic')      → shape annotation (Feature 6)
  ├── text (type='text')            → text annotation (Feature 7)
  └── image (type='image')          → image overlay annotation (Feature 8)
        ├── effectIds[]             → adjustments & filter effects
        └── properties:
              image/src             → data URL or loaded URL
              image/originalWidth   → source natural width
              image/originalHeight  → source natural height
              transform/position/*  → position on canvas
              transform/size/*      → display dimensions
              transform/rotation    → rotation angle
              appearance/opacity    → transparency
              crop/*                → optional crop (future)
```

Base image vs. overlay distinction: the first image child of the page is the "base layer" (non-draggable, fills the page). Subsequent image children are overlays (draggable, transformable).

### Gallery Config Extension

```ts
interface GalleryItem {
  /** Full-resolution URL for canvas placement. */
  originalUrl: string;
  /** Thumbnail URL for gallery grid display. */
  previewUrl: string;
  /** Optional label for accessibility. */
  label?: string;
}

interface ImageToolConfig {
  maxFileSize?: number;       // existing — default 5 MB
  maxDimension?: number;      // existing — default 2048 px
  disableUpload?: boolean;    // new — hide upload zone
  gallery?: GalleryItem[];    // new — preset image gallery
}
```

### Placement Logic

When placing an image annotation (upload or gallery pick):

1. Read/load image → get natural dimensions (`naturalWidth`, `naturalHeight`)
2. Downscale if > `maxDimension` (existing logic)
3. Calculate display size: `targetSize = min(pageWidth, pageHeight) * 0.4`, scale to fit within `targetSize` preserving aspect ratio
4. Center on page: `x = (pageWidth - displayWidth) / 2`, `y = (pageHeight - displayHeight) / 2`
5. Call `ce.block.addImage(pageId, src, x, y, displayWidth, displayHeight, origWidth, origHeight)`
6. Auto-select the new block

This logic already exists in `useImageTool.handleAddImage()`.

---

## Implementation Steps

### Phase A: Gallery Config & Data Flow

**Step 1. Extend `ImageToolConfig` with gallery options** _(no dependencies)_

- File: `packages/image-editor/src/config/config.types.ts`
- Add `disableUpload?: boolean` and `gallery?: GalleryItem[]` to `ImageToolConfig`
- Add `GalleryItem` interface: `{ originalUrl: string; previewUrl: string; label?: string }`

**Step 2. Add `handleAddGalleryImage` to `useImageTool`** _(depends on Step 1)_

- File: `packages/image-editor/src/hooks/use-image-tool.ts`
- Add method: `handleAddGalleryImage(item: GalleryItem): Promise<void>`
  - Fetch image from `item.originalUrl` via `loadImageElement(url)`
  - Get natural dimensions from loaded `HTMLImageElement`
  - Downscale if needed (reuse existing `downscaleImage()`)
  - Calculate placement size & position (reuse existing centering logic)
  - Call `ce.block.addImage(...)` and auto-select
- **Security:** Validate URL protocol (only `https:` and `data:`) to prevent SSRF. Do not fetch arbitrary URLs.

### Phase B: Gallery UI

**Step 3. Create `ImageGallery` component** _(depends on Step 1)_

- New file: `packages/image-editor/src/components/panels/image-gallery.tsx`
- Props: `items: GalleryItem[]`, `onSelect: (item: GalleryItem) => void`
- UI: Responsive grid of thumbnail images
  - Each item renders `<img src={item.previewUrl} alt={item.label} />` in a clickable card
  - Hover state with subtle border highlight
  - Loading skeleton while thumbnails load
- Grid layout: 3 columns, gap-2, matching shapes panel grid style

**Step 4. Integrate gallery into `ImagePanel`** _(depends on Steps 2–3)_

- File: `packages/image-editor/src/components/panels/image-panel.tsx`
- If `config.image?.gallery?.length > 0`: render `<ImageGallery>` below the upload zone
- If `config.image?.disableUpload === true`: hide the upload zone, show only gallery
- If neither gallery nor upload: show empty state message
- Wire `onSelect` → `handleAddGalleryImage(item)`

### Phase C: Image Overlay Property Controls

**Step 5. Add "Replace Image" action in block property bar** _(no dependencies)_

- File: `packages/image-editor/src/components/shell/block-properties-bar.tsx`
- When selected block is `type='image'` and is not the base layer:
  - Show "Replace" button that opens file picker
  - On file selected → call `handleReplaceImage(file, blockId)`
- Detect base layer: first image child of the page, or the block matching `editableBlockId`

**Step 6. Add opacity control for image overlays** _(no dependencies)_

- Verify opacity slider already shows for selected image blocks in the block property bar
- Opacity is controlled via `appearance/opacity` property — already works with generic property controls
- If not wired up, add it to the block properties panel for `image` type blocks

### Phase D: Tests

**Step 7. Unit tests for gallery image placement** _(depends on Steps 1–2)_

- File: `packages/image-editor/src/image-editor.test.tsx` (extend existing)
- Test cases:
  - Gallery item placement calculates correct position and size
  - URL validation rejects non-https URLs
  - Downscaling triggers when image exceeds maxDimension
  - `addImage` is called with correct parameters

**Step 8. Integration tests for image overlay workflow** _(depends on Steps 3–6)_

- Test cases:
  - Upload image → overlay appears on canvas, is auto-selected
  - Gallery pick → overlay appears centered
  - Replace image → source updates, dimensions adjust
  - Delete overlay → block destroyed, canvas updates
  - Undo/redo → overlay restored/removed correctly
  - Multiple overlays → z-order correct
  - Effects applied to overlay (not base image)

---

## File Change Summary

| File | Change |
|------|--------|
| `image-editor/src/config/config.types.ts` | Add `GalleryItem`, extend `ImageToolConfig` |
| `image-editor/src/hooks/use-image-tool.ts` | Add `handleAddGalleryImage()`, URL validation |
| `image-editor/src/components/panels/image-gallery.tsx` | **New** — gallery grid component |
| `image-editor/src/components/panels/image-panel.tsx` | Integrate gallery, respect `disableUpload` |
| `image-editor/src/components/shell/block-properties-bar.tsx` | "Replace" button for image overlays |
| `image-editor/src/image-editor.test.tsx` | Gallery placement & workflow tests |

### No Engine Changes Needed

The engine already fully supports image annotations:
- `image` block type with all required properties
- `block.addImage()` API
- Konva renderer: `Konva.Image` creation, async loading, crop, flip, filter pipeline
- Transform, selection, z-order, undo/redo — all work generically on image blocks

---

## Security Considerations

- **File upload validation:** Already implemented — MIME type check (`image/*`), file size limit (configurable, default 5 MB)
- **Image downscaling:** Already implemented — prevents memory exhaustion from huge images (default max 2048px)
- **Gallery URLs:** Must validate protocol (`https:` only in production) to prevent SSRF when fetching gallery item URLs
- **CORS:** Gallery images loaded with `crossOrigin="anonymous"` for canvas taint-free rendering
- **XSS:** Image src stored as data URLs or validated URLs — never rendered as HTML

## Configuration Example

```tsx
<ImageEditor
  src={baseImageSrc}
  config={{
    tools: ['crop', 'adjust', 'filter', 'text', 'shapes', 'image'],
    image: {
      maxFileSize: 5 * 1024 * 1024,   // 5 MB
      maxDimension: 2048,
      disableUpload: false,
      gallery: [
        {
          originalUrl: 'https://cdn.example.com/stickers/star.png',
          previewUrl: 'https://cdn.example.com/stickers/star-thumb.png',
          label: 'Gold star',
        },
        {
          originalUrl: 'https://cdn.example.com/stickers/badge.png',
          previewUrl: 'https://cdn.example.com/stickers/badge-thumb.png',
          label: 'Badge',
        },
      ],
    },
  }}
/>
```

## Future Expansion

1. **Sticker packs** — Group gallery items into named categories with tab navigation
2. **Search/filter gallery** — Text search within large sticker libraries
3. **SVG stickers** — Support SVG sources with recoloring (change fill/stroke)
4. **Image crop-to-fit** — Crop overlay images to specific aspect ratios
5. **Image masking** — Apply shape masks to image overlays (circle crop, star crop)
6. **Drag from gallery** — Drag gallery items directly onto canvas (vs. click-to-center)
7. **Copy/paste images** — Ctrl+V to paste clipboard images as overlays
8. **URL input** — Text field to paste image URL directly (with validation)
