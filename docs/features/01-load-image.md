# Feature 1: Load Image onto Canvas

**Status:** done

## User Story

As a user, I open the image editor with an image (URL or File). The editor displays the image centered on the canvas, sized to fit the viewport. This is the foundation for all subsequent editing features.

## Scenario

1. Developer renders `<ImageEditor src="https://example.com/photo.jpg" />` (or passes a File/Blob)
2. The image loads asynchronously
3. A scene is created with dimensions matching the image's natural size
4. An image block is created and added as a child of the page
5. The renderer displays the image, centered and fitted to the viewport
6. The image block is not draggable or transformable (it is the "base layer")

## Engine Gaps

### 1. No image block rendering in Konva adapter

The `KonvaRendererAdapter.#createNode()` only handles `text`, `ellipse`, and `rect`. It needs to handle `image` block type with `Konva.Image`.

### 2. No `image/src` property

The block property system has no concept of image source URLs. Need to add `image/src` as a string property and handle async image loading in the renderer.

### 3. No image caching

When `image/src` changes, the renderer must load the image and cache the `HTMLImageElement` to avoid re-fetching.

### 4. BlockType missing image-specific handling

The `block-defaults.ts` may need image-specific default properties.

## Engine Changes

### A. Add image defaults in `block-defaults.ts`

```ts
case 'image':
  return {
    'transform/position/x': 0,
    'transform/position/y': 0,
    'transform/size/width': 100,
    'transform/size/height': 100,
    'transform/rotation': 0,
    'appearance/opacity': 1,
    'appearance/visible': true,
    'image/src': '',
  };
```

### B. Add Konva.Image handling in `konva-renderer-adapter.ts`

In `#createNode()`:

- When `block.type === 'image'`, create a `Konva.Image` node
- The image should not be draggable by default (base layer behavior)

In `#updateNode()`:

- Read `image/src` property
- Load the image via `HTMLImageElement` if src changed
- Set the Konva.Image's `image` attribute
- Set width/height from block properties

### C. Image loading utility

Add an image cache map (`Map<string, HTMLImageElement>`) in the adapter to avoid redundant loads. Provide a `loadImage(src: string): Promise<HTMLImageElement>` helper.

## Image Editor Package

### A. Scaffold `packages/image-editor`

- `package.json` with dependencies on `@creative-editor/engine` and React
- `tsconfig.json` extending root
- `src/index.ts` exporting `ImageEditor`

### B. `ImageEditor` component (`src/image-editor.tsx`)

Props:

- `src: string | File | Blob` -- the image to edit
- `onSave?: (blob: Blob) => void` -- callback when user saves
- `width?: number` -- container width (default: 100%)
- `height?: number` -- container height (default: 100%)

Behavior:

1. Create a container div
2. Initialize `CreativeEngine` with the container
3. Load the image to get natural dimensions
4. Call `engine.scene.create({ width: naturalWidth, height: naturalHeight })`
5. Create an image block: `engine.block.create('image')`
6. Set `image/src` to the URL (or create object URL for File/Blob)
7. Set block size to match image dimensions
8. Append block to page
9. Fit to screen

### C. Zustand store (`src/store/image-editor-store.ts`)

Initial state:

- `activeTool: 'select'`
- `originalImage: { width, height, src }` -- metadata about the loaded image
- `isLoading: boolean`

## Filerobot Reference

- `useLoadMainSource.js` -- loads the image source and sets dimensions
- `useSetOriginalSource.js` -- stores original image metadata
- `LayersBackground.jsx` -- renders the base image as a Konva Image node
- `getOriginalSourceInitialScale.js` -- calculates initial scale to fit canvas

## Implementation Steps

1. Add image defaults to `packages/engine/src/block/block-defaults.ts`
2. Add image loading + caching utility in Konva adapter
3. Extend `KonvaRendererAdapter.#createNode()` for image blocks
4. Extend `KonvaRendererAdapter.#updateNode()` for image properties
5. Scaffold `packages/image-editor` package
6. Create `ImageEditor` component
7. Create `image-editor-store.ts`
8. Wire up in `apps/demo` and test

## Acceptance Criteria

- [x] Passing a URL to `<ImageEditor src="..." />` loads and displays the image
- [x] Image is centered and fitted to the viewport
- [x] Image block has correct natural dimensions
- [x] Scene dimensions match the image
- [x] No console errors during load
- [x] Image block is not draggable (base layer)

---

## Improvements

**Status:** not started

The initial implementation covers the happy path. The following improvements harden Feature 1 for real-world use, add missing input methods, handle edge cases, and fix tech debt — all before moving to Feature 2.

### Area 1: Error Handling & Loading States (Robustness)

#### 1.1 Add error state to the store

- Add `error: string | null` and `setError(msg)` / `clearError()` to `image-editor-store.ts`.
- Currently a load failure produces an **unhandled promise rejection** and the loading spinner stays forever.

#### 1.2 Wrap init flow in try/catch with user-facing error UI

- In `image-editor.tsx`, wrap the `init()` call in try/catch. On failure → `store.setError(message)`, set `isLoading = false`.
- Render an error overlay when `error` is set: message + **Retry** button that re-triggers `init()`.

#### 1.3 CORS fallback with retry

- In `load-image.ts`, if `loadImage()` fails with `crossOrigin = 'anonymous'`, retry **once** without the `crossOrigin` attribute (matches filerobot's `noCrossOrigin` pattern).
- Log a console warning that the canvas will be tainted (export will be blocked).

#### 1.4 Handle renderer image load errors

- In `KonvaRendererAdapter.#updateNode()`, add `.catch()` to the `#loadImage().then()` chain.
- On error: render a placeholder rect with a "broken image" indicator instead of silently failing.

### Area 2: Input Methods

#### 2.1 Support additional source types

Expand the `src` prop to: `string | File | Blob | HTMLImageElement | HTMLCanvasElement`.

Update `sourceToUrl()` in `load-image.ts`:
| Source Type | Handling |
|---|---|
| `string` (URL or base64 data URL) | Pass through (already works) |
| `File` / `Blob` | `URL.createObjectURL()` (already works) |
| `HTMLImageElement` | Use `.src` directly; if not `.complete`, wait for `load` event |
| `HTMLCanvasElement` | Call `canvas.toDataURL()` to get a data URL string |

**Filerobot reference:** `useSetOriginalSource.js` branches on `instanceof HTMLImageElement` vs string vs object.

#### 2.2 Drag-and-drop onto the editor

- Attach `onDragOver` (prevent default) and `onDrop` handlers to the container div in `image-editor.tsx`.
- On drop: extract `File` from `dataTransfer.files`, validate it's an image, re-initialize with the new source.
- Also support dropping a URL string (`dataTransfer.getData('text/uri-list')`).

#### 2.3 Clipboard paste support

- Add a `paste` event listener on the container div.
- On paste: check `clipboardData.items` for `image/*` types, extract as `Blob`, re-initialize.

#### 2.4 Enhance demo app with all input methods

Update `apps/demo/src/app.tsx`:

- Add a **URL text input** field (user types/pastes a URL and clicks "Load").
- Add a **drag-and-drop zone** on the picker screen (dashed border visual area).
- Add instructions text mentioning **Ctrl+V** paste support.

### Area 3: Image Processing & Validation

#### 3.1 Image validation

Create `packages/image-editor/src/utils/validate-image.ts`:

- **File type**: accept `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `image/svg+xml`, `image/bmp`.
- **File size**: warn if > 20 MB, reject if > 50 MB with descriptive error.
- **Dimensions** (post-load): warn if > 8000 px on either axis, reject if > 16000 px (browser canvas limits).
- Expose optional props on `ImageEditor`: `maxFileSize`, `maxDimension`, `acceptedFormats`.

#### 3.2 EXIF orientation auto-correction

- Use `createImageBitmap(blob, { imageOrientation: 'from-image' })` when input is a `File`/`Blob` (wide browser support since ~2020).
- For URL sources: modern browsers auto-correct via CSS `image-orientation: from-image` (default since Chrome 81, Firefox 26, Safari 13.1).
- Add utility `packages/image-editor/src/utils/correct-orientation.ts` that takes `File` / `Blob` → returns a corrected `ImageBitmap` or `HTMLImageElement` with correct dimensions.
- **No external EXIF library needed** — keeps bundle size minimal.

#### 3.3 Handle very large images gracefully

- After loading, if `naturalWidth × naturalHeight > 25 megapixels`, downscale using an offscreen canvas to a working resolution.
- Store both **original dimensions** (for accurate export later) and **working dimensions** in the store.
- Add utility `packages/image-editor/src/utils/downscale-image.ts`.

### Area 4: Responsive Canvas & Tech Debt

#### 4.1 ResizeObserver for container resize

- In `KonvaRendererAdapter`, after creating the Konva Stage in `createScene()`, attach a `ResizeObserver` to the root element.
- On resize: update `stage.width()` / `stage.height()` and call `fitToScreen()` to re-center.
- Clean up the observer in `dispose()`.
- Currently the stage is sized **once** at `createScene` and never updated.

#### 4.2 Consolidate duplicate image caches

- **Problem**: `load-image.ts` has its own `Map<string, HTMLImageElement>` and `KonvaRendererAdapter` has a separate `#imageCache` Map. The same image is loaded twice.
- **Fix**: Create a single shared `ImageCache` module in the engine package. Both the component and the renderer reference the same cache.

#### 4.3 Fix object URL cleanup

- Currently `revokeObjectUrl()` is called in the `useEffect` cleanup, but the blob URL is still in the image cache → stale reference.
- **Fix**: Remove the cache entry when revoking. Ensure the Konva adapter doesn't try to re-use a revoked blob URL.

#### 4.4 Support source change (swap image)

- Currently changing the `src` prop does NOT reload (the `useEffect` runs on mount only).
- **Fix**: Add `src` to the `useEffect` dependency list. On source change: dispose old engine, clear caches for old source, re-initialize with new image.
- Full dispose-and-reinit (rather than incremental update) — simpler and avoids subtle state leaks.

### Filerobot Reference (Improvements)

| Filerobot File                     | Relevant For                                                                |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `useSetOriginalSource.js`          | Source type branching (HTMLImageElement vs string vs object), deduplication |
| `loadImage.js`                     | CORS handling (`noCrossOrigin`), name extraction from URL                   |
| `useLoadMainSource.js`             | Source change handling, `resetOnSourceChange`, `keepZoomOnSourceChange`     |
| `getOriginalSourceInitialScale.js` | "Never scale up" logic, contain-fit                                         |
| `isSameSource.js`                  | Source comparison for deduplication                                         |
| `extractNameFromUrl.js`            | Filename extraction from URL                                                |
| `defaultConfig.js`                 | `noCrossOrigin`, `resetOnSourceChange`, `keepZoomOnSourceChange` options    |

### Implementation Order

1. **1.1 + 1.2** — Error state + try/catch + error UI (foundation for everything else)
2. **4.2 + 4.3** — Consolidate caches + fix cleanup (tech debt, reduces future bugs)
3. **1.3 + 1.4** — CORS fallback + renderer error handling
4. **4.1** — ResizeObserver
5. **2.1** — Additional source types
6. **3.1** — Image validation
7. **3.2** — EXIF orientation
8. **3.3** — Large image downscaling
9. **2.2 + 2.3** — Drag-and-drop + paste
10. **2.4** — Demo app enhancements
11. **4.4** — Source change support

### Improvement Acceptance Criteria

- [ ] Invalid URL → error overlay with retry button; retry with valid URL → loads correctly
- [ ] Cross-origin image without CORS headers → image still renders (tainted canvas warning in console)
- [ ] Renderer image load failure → placeholder shown instead of blank node
- [ ] `HTMLImageElement`, `HTMLCanvasElement`, data URL, File, Blob → all load correctly
- [ ] Drag image file from desktop onto editor → image loads
- [ ] Copy image, Ctrl+V in editor → image loads
- [ ] Demo app has URL input, drag-and-drop zone, paste instructions
- [ ] 60 MB file → rejected with "file too large" error
- [ ] 10000×10000 image → warning shown, image downscaled for working resolution
- [ ] Mobile photo with EXIF rotation → displays upright
- [ ] Browser window resize → canvas reflows, image stays centered
- [ ] Same URL loaded twice → only one network request (single shared cache)
- [ ] Blob URL revoked → no stale cache hits
- [ ] Change `src` prop → old image replaced with new one
