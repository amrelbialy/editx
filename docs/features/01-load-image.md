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

- `package.json` with dependencies on `@editx/engine` and React
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
2. Initialize `EditxEngine` with the container
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

## Testing Phase

### Unit Tests

Target: Pure logic and utilities in isolation.

| Test File                                            | What to Test                                                                               | Status |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| `engine/src/__tests__/block-defaults.test.ts`        | Image block defaults include all expected properties (`image/src`, transforms, appearance) | âœ…     |
| `engine/src/utils/load-image.test.ts`                | `loadImage()` resolves with an `HTMLImageElement` for a valid URL                          | âœ…     |
| `engine/src/utils/load-image.test.ts`                | `loadImage()` rejects for an invalid/broken URL                                            | âœ…     |
| `engine/src/utils/load-image.test.ts`                | `sourceToUrl()` returns the URL string as-is for string input                              | âœ…     |
| `engine/src/utils/load-image.test.ts`                | `sourceToUrl()` creates an object URL for `File`/`Blob` input                              | âœ…     |
| `engine/src/utils/load-image.test.ts`                | CORS fallback: retries without `crossOrigin` attribute on first failure                    | âœ…     |
| `engine/src/utils/load-image.test.ts`                | CORS fallback: succeeds on second attempt â†’ image rendered, tainted canvas                 | âœ…     |
| `engine/src/utils/load-image.test.ts`                | CORS fallback: rejects if both attempts fail                                               | âœ…     |
| `image-editor/src/store/image-editor-store.test.ts`  | Store initializes with `isLoading: true`, `activeTool: 'select'`, `error: null`            | âœ…     |
| `image-editor/src/store/image-editor-store.test.ts`  | `setOriginalImage()` updates `originalImage` with width, height, src                       | âœ…     |
| `image-editor/src/store/image-editor-store.test.ts`  | `setError(msg)` sets `error` state to the message string                                   | âœ…     |
| `image-editor/src/store/image-editor-store.test.ts`  | `clearError()` resets `error` back to `null`                                               | âœ…     |
| `image-editor/src/store/image-editor-store.test.ts`  | `reset()` clears error along with other state                                              | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | Accepts valid image MIME types (jpeg, png, webp, gif, svg, bmp)                            | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | Rejects non-image MIME types (text/plain, application/pdf)                                 | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | Rejects files exceeding max file size (default 50 MB)                                      | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | Returns warning for files in the warning zone (> 20 MB, < 50 MB)                           | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | Respects custom `maxFileSize`, `warnFileSize`, `acceptedTypes` options                     | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | `validateImageDimensions()` rejects images exceeding max pixels (default 16000 px)         | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | `validateImageDimensions()` warns for large images (> 8000 px)                             | âœ…     |
| `image-editor/src/utils/validate-image.test.ts`      | `validateImageDimensions()` passes for images within limits                                | âœ…     |
| `image-editor/src/utils/correct-orientation.test.ts` | Corrects an image File and returns a canvas with correct dimensions                        | âœ…     |
| `image-editor/src/utils/correct-orientation.test.ts` | Corrects a Blob and returns a canvas                                                       | âœ…     |
| `image-editor/src/utils/correct-orientation.test.ts` | Returns canvas with matching width/height from `createImageBitmap`                         | âœ…     |
| `image-editor/src/utils/correct-orientation.test.ts` | Rejects if `createImageBitmap` fails                                                       | âœ…     |
| `image-editor/src/utils/correct-orientation.test.ts` | Calls `createImageBitmap` with `imageOrientation: 'from-image'`                            | âœ…     |
| `image-editor/src/utils/correct-orientation.test.ts` | Draws the bitmap onto a 2D canvas context                                                  | âœ…     |
| `image-editor/src/utils/downscale-image.test.ts`     | Returns the image as-is when below the megapixel budget                                    | âœ…     |
| `image-editor/src/utils/downscale-image.test.ts`     | Downscales images exceeding the megapixel budget (preserves aspect ratio)                  | âœ…     |
| `image-editor/src/utils/downscale-image.test.ts`     | Uses custom `maxMegapixels` parameter                                                      | âœ…     |
| `image-editor/src/utils/downscale-image.test.ts`     | Preserves original dimensions in result when downscaling                                   | âœ…     |
| `image-editor/src/utils/downscale-image.test.ts`     | Returns a data URL from the offscreen canvas                                               | âœ…     |
| `image-editor/src/utils/downscale-image.test.ts`     | Handles exact boundary (25 MP) without downscaling                                         | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | Two identical URL strings â†’ `true`                                                         | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | Two different URL strings â†’ `false`                                                        | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | Same `File` reference â†’ `true`                                                             | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | Different `File` instances â†’ `false`                                                       | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | Same `HTMLImageElement` â†’ `true`                                                           | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | Different `HTMLImageElement` â†’ `false`                                                     | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | `undefined` vs `undefined` â†’ `true`                                                        | âœ…     |
| `image-editor/src/utils/is-same-source.test.ts`      | `undefined` vs string â†’ `false`                                                            | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Extracts filename from URL path (e.g. `sunset.jpg` â†’ `sunset`)                             | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Strips query parameters from URL                                                           | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Handles URL with hash fragment                                                             | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Returns `'image'` for data URLs                                                            | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Returns `'image'` for blob URLs                                                            | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Uses `file.name` for `File` input                                                          | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Returns `'image'` for `Blob` input                                                         | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Uses `.name` property from `HTMLImageElement`                                              | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Falls back to extracting from `.src` for `HTMLImageElement` without `.name`                | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Returns `'canvas'` for `HTMLCanvasElement`                                                 | âœ…     |
| `image-editor/src/utils/extract-filename.test.ts`    | Returns `'image'` for unrecognized/empty sources                                           | âœ…     |
| `image-editor/src/store/image-editor-store.test.ts`  | `setShownImageDimensions()` stores width, height, scale                                    | âœ…     |
| `image-editor/src/store/image-editor-store.test.ts`  | `setOriginalImage()` stores `name` field                                                   | âœ…     |

### Component Tests

Target: React component rendering and user-facing behavior using React Testing Library.

| Test File                                | What to Test                                                       | Status |
| ---------------------------------------- | ------------------------------------------------------------------ | ------ |
| `image-editor/src/image-editor.test.tsx` | Renders a container div and initializes the engine                 | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Shows a loading state while the image is being loaded              | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Displays the image once loaded (canvas element present)            | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Shows an error overlay when the image fails to load                | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Shows a retry button on error; retry re-triggers init              | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Cleans up engine on unmount via `dispose()`                        | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Container div has `tabIndex` for keyboard/paste events             | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Handles `dragover` event (prevents default for drop zone)          | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Handles `drop` with image file â†’ re-initializes with dropped file  | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Handles `paste` with image blob â†’ re-initializes with pasted image | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Sets `shownImageDimensions` in store after loading                 | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Extracts and stores filename from URL source                       | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Skips duplicate load when `isSameSource` returns true              | âœ…     |
| `image-editor/src/image-editor.test.tsx` | Preserves zoom/pan when `keepZoomOnSourceChange` is true           | âœ…     |

### Integration Tests

Target: Engine + Renderer working together end-to-end.

| Test File                                            | What to Test                                                                                         | Status |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------ |
| `engine/src/__tests__/image-block-rendering.test.ts` | Creating an image block and setting `image/src` triggers the renderer to create a `Konva.Image` node | âœ…     |
| `engine/src/__tests__/image-block-rendering.test.ts` | Scene dimensions match the image's natural width/height                                              | âœ…     |
| `engine/src/__tests__/image-block-rendering.test.ts` | Image block is not draggable after creation                                                          | âœ…     |
| `engine/src/__tests__/image-block-rendering.test.ts` | Image cache returns the same element for repeated loads of the same URL                              | âœ…     |

### Test Summary

| Package        | Test Files | Tests | Status         |
| -------------- | ---------- | ----- | -------------- |
| `engine`       | 14         | 238   | âœ… All passing |
| `image-editor` | 7          | 78    | âœ… All passing |

### When to Run

- **Unit tests**: On every save / pre-commit hook
- **Component + Integration tests**: On every PR / before merging

## Acceptance Criteria

- [x] Passing a URL to `<ImageEditor src="..." />` loads and displays the image
- [x] Image is centered and fitted to the viewport
- [x] Image block has correct natural dimensions
- [x] Scene dimensions match the image
- [x] No console errors during load
- [x] Image block is not draggable (base layer)

---

## Improvements

**Status:** done The following improvements harden Feature 1 for real-world use, add missing input methods, handle edge cases, and fix tech debt â€” all before moving to Feature 2.

### Area 1: Error Handling & Loading States (Robustness)

#### 1.1 Add error state to the store

- Add `error: string | null` and `setError(msg)` / `clearError()` to `image-editor-store.ts`.
- Currently a load failure produces an **unhandled promise rejection** and the loading spinner stays forever.

#### 1.2 Wrap init flow in try/catch with user-facing error UI

- In `image-editor.tsx`, wrap the `init()` call in try/catch. On failure â†’ `store.setError(message)`, set `isLoading = false`.
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
- Add utility `packages/image-editor/src/utils/correct-orientation.ts` that takes `File` / `Blob` â†’ returns a corrected `ImageBitmap` or `HTMLImageElement` with correct dimensions.
- **No external EXIF library needed** â€” keeps bundle size minimal.

#### 3.3 Handle very large images gracefully

- After loading, if `naturalWidth Ã— naturalHeight > 25 megapixels`, downscale using an offscreen canvas to a working resolution.
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

- Currently `revokeObjectUrl()` is called in the `useEffect` cleanup, but the blob URL is still in the image cache â†’ stale reference.
- **Fix**: Remove the cache entry when revoking. Ensure the Konva adapter doesn't try to re-use a revoked blob URL.

#### 4.4 Support source change (swap image)

- Currently changing the `src` prop does NOT reload (the `useEffect` runs on mount only).
- **Fix**: Add `src` to the `useEffect` dependency list. On source change: dispose old engine, clear caches for old source, re-initialize with new image.
- Full dispose-and-reinit (rather than incremental update) â€” simpler and avoids subtle state leaks.

### Area 5: Load Flow Hardening (Filerobot Parity)

Gaps identified by comparing with filerobot's `BaseLayer`, `useLoadMainSource`, `useSetOriginalSource`, `loadImage`, `isSameSource`, `getOriginalSourceInitialScale`, and `extractNameFromUrl`.

#### 5.1 Source deduplication (`isSameSource`)

- Before calling `initEditor`, compare the new source with the currently loaded source.
- If the **same URL / File / Blob / HTMLImageElement** is already loaded, **skip the entire init**.
- Avoids destroying and recreating the engine when React re-renders with the same `src` prop (or StrictMode double-mount).
- Add helper `isSameSource(a, b)` in `packages/image-editor/src/utils/is-same-source.ts`.
- **Filerobot ref:** `isSameSource.js` â€” compares by identity for HTMLImageElement, by key-equality for objects.

#### 5.2 Filename extraction from URL

- Extract a human-readable filename from the image source URL (e.g. `https://example.com/photos/sunset.jpg` â†’ `sunset`).
- Store it in `originalImage.name` so the save/export dialog can suggest a default filename.
- Add helper `extractFilename(source)` in `packages/image-editor/src/utils/extract-filename.ts`.
- For `File` inputs, use `file.name`; for `Blob`, use `'image'`; for `HTMLImageElement`, use element `.name` or extract from `.src`.
- **Filerobot ref:** `extractNameFromUrl.js`, `loadImage.js` sets `imageElement.name`.

#### 5.3 "Never scale up" initial fit

- In `KonvaRendererAdapter.fitToScreen()`, clamp the computed scale to `Math.min(scale, 1)` so images smaller than the viewport are shown at **native 1:1 resolution** instead of being upscaled and looking pixelated.
- Currently `fitToScreen` uses `Math.min(scaleX, scaleY)` which can exceed 1.0 for small images.
- **Filerobot ref:** `getOriginalSourceInitialScale.js` returns `1` when canvas is larger than image.

#### 5.4 Track `shownImageDimensions` in store

- Add `shownImageDimensions: { width, height, scale } | null` to the Zustand store.
- After `fitToScreen`, compute and store the pixel dimensions as rendered on canvas (natural dims Ã— initial scale).
- These dimensions are needed by the crop tool (Feature 2) for coordinate mapping, and by resize for accurate preview.
- **Filerobot ref:** BaseLayer computes `scaledOriginalSource = { width: originalSource.width * initialScale, height: ... }` and stores `shownImageDimensions` in state.

#### 5.5 Graceful fallback when dimensions are known

- If image loading fails but the caller provided explicit `width`/`height` (e.g. `src = { src: url, width: 800, height: 600 }`), still set `originalImage` dimensions (without `src`) so the UI can render a skeleton/placeholder at the correct aspect ratio instead of a generic error.
- **Filerobot ref:** `setOriginalSourceIfDimensionsFound()` in `useSetOriginalSource.js`.

#### 5.6 Skip loading spinner on metadata-only source change

- When the `src` prop changes but the actual image URL is the **same** (e.g. only `width`/`height` metadata changed), skip the loading spinner and re-initialize silently.
- Avoids a jarring flash/spinner when only non-visual properties changed.
- **Filerobot ref:** `useLoadMainSource.js` checks `isSrcLinkNotChanged` and skips `handleLoading` wrapper.

#### 5.7 Concurrent load guard

- Track the currently-loading source URL in a ref (`loadingSourceRef`).
- If `initEditor` is called while a load for the **same source** is already in progress, skip the duplicate.
- Prevents wasted work from React StrictMode double-mount or rapid prop changes.
- **Filerobot ref:** `imageBeingLoadedSrc` ref in `useSetOriginalSource.js`.

#### 5.8 Preserve HTMLImageElement `.name` metadata

- When an `HTMLImageElement` is passed as source, carry its `.name` property into `originalImage.name`.
- If `.name` is empty, fall back to extracting from `.src` via the filename extractor (5.2).
- **Filerobot ref:** `useSetOriginalSource.js` preserves `imgToLoad.name`, sets from `defaultSavedImageName` config.

#### 5.9 Preserve zoom/pan on source change (opt-in)

- Add an optional prop `keepZoomOnSourceChange?: boolean` (default `false`).
- When `true` and the source changes, after re-init preserve the previous `zoom` and `pan` state instead of resetting to `fitToScreen`.
- Useful for before/after comparisons or swapping image variants.
- **Filerobot ref:** `keepZoomOnSourceChange` config in `useLoadMainSource.js`.

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

1. **1.1 + 1.2** â€” Error state + try/catch + error UI (foundation for everything else)
2. **4.2 + 4.3** â€” Consolidate caches + fix cleanup (tech debt, reduces future bugs)
3. **1.3 + 1.4** â€” CORS fallback + renderer error handling
4. **4.1** â€” ResizeObserver
5. **2.1** â€” Additional source types
6. **3.1** â€” Image validation
7. **3.2** â€” EXIF orientation
8. **3.3** â€” Large image downscaling
9. **2.2 + 2.3** â€” Drag-and-drop + paste
10. **2.4** â€” Demo app enhancements
11. **4.4** â€” Source change support
12. **5.1** â€” Source deduplication
13. **5.2 + 5.8** â€” Filename extraction + HTMLImageElement name
14. **5.3 + 5.4** â€” Never scale up + shownImageDimensions
15. **5.5 + 5.6** â€” Graceful fallback + skip spinner
16. **5.7** â€” Concurrent load guard
17. **5.9** â€” Preserve zoom on source change

### Improvement Acceptance Criteria

- [x] Invalid URL â†’ error overlay with retry button; retry with valid URL â†’ loads correctly
- [x] Cross-origin image without CORS headers â†’ image still renders (tainted canvas warning in console)
- [x] Renderer image load failure â†’ placeholder shown instead of blank node
- [x] `HTMLImageElement`, `HTMLCanvasElement`, data URL, File, Blob â†’ all load correctly
- [x] Drag image file from desktop onto editor â†’ image loads
- [x] Copy image, Ctrl+V in editor â†’ image loads
- [x] Demo app has URL input, drag-and-drop zone, paste instructions
- [x] 60 MB file â†’ rejected with "file too large" error
- [x] 10000Ã—10000 image â†’ warning shown, image downscaled for working resolution
- [x] Mobile photo with EXIF rotation â†’ displays upright
- [x] Browser window resize â†’ canvas reflows, image stays centered
- [x] Same URL loaded twice â†’ only one network request (single shared cache)
- [x] Blob URL revoked â†’ no stale cache hits
- [x] Change `src` prop â†’ old image replaced with new one
- [x] Same `src` prop re-rendered â†’ no engine destroy/recreate (deduplication)
- [x] Image loaded from URL â†’ `originalImage.name` contains extracted filename
- [x] File dropped â†’ `originalImage.name` contains `file.name`
- [x] 200Ã—200 image in 1920Ã—1080 viewport â†’ shown at native 1:1, not upscaled
- [x] After load, `shownImageDimensions` in store reflects actual canvas pixel size
- [x] Image load fails with known width/height â†’ placeholder skeleton at correct aspect ratio
- [x] Metadata-only source change â†’ no loading spinner flash
- [x] React StrictMode double-mount â†’ only one load in progress
- [x] `HTMLImageElement` with `.name` â†’ name preserved in originalImage
- [x] `keepZoomOnSourceChange={true}` + src change â†’ zoom/pan preserved
