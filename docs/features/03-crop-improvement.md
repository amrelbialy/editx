# Feature: Improved Crop (img.ly-style)

## Summary

Improve the crop system so that committing a crop **resizes the page to the crop dimensions**, matching img.ly CE.SDK behavior. Currently, crop stores a source region but keeps page dimensions unchanged, causing Konva to stretch the cropped region across the full page (distortion). The new behavior: crop = clip + resize — the page shrinks to the cropped area and the image renders pixel-perfect.

## Current Behavior (Problem)

1. User enters crop mode → overlay shows full image with draggable crop rect
2. User selects a preset (e.g. 16:9) → crop rect adjusts within the image
3. User clicks Apply → `commitCrop()` writes `CROP_X/Y/WIDTH/HEIGHT/ENABLED` to the block
4. Renderer reads crop properties → calls `Konva.Image.crop()` to slice a source region
5. **Problem**: Page dimensions remain unchanged (e.g. 1080×1080). Konva stretches the cropped region (e.g. 1080×607 for 16:9) to fill 1080×1080 → image is distorted
6. Re-entering crop mode uses current `PAGE_WIDTH/HEIGHT` as the image rect → after commit, the user can only crop within the already-cropped area

## Target Behavior (img.ly-style)

1. User enters crop mode → overlay shows the **full original image** with draggable crop rect
2. If a previous crop exists, the overlay highlights the current crop region within the original
3. User selects a preset or drags → crop rect adjusts
4. User clicks Apply → `commitCrop()`:
   - Writes `CROP_X/Y/WIDTH/HEIGHT/ENABLED` (source region in original image coordinates)
   - **Resizes the page**: `PAGE_WIDTH = cropWidth`, `PAGE_HEIGHT = cropHeight`
   - Camera re-fits to the new page dimensions
5. Renderer applies Konva `crop()` — since page dimensions now match crop dimensions, the image renders 1:1 without distortion
6. Re-entering crop mode reads **original image dimensions** (stored as properties) → user can expand/adjust crop freely
7. Undo restores both page dimensions and crop properties atomically (single batch)

## Architecture

### New Property Keys

| Key                    | Type  | Default | Purpose                               |
| ---------------------- | ----- | ------- | ------------------------------------- |
| `image/originalWidth`  | float | 0       | Original image width before any crop  |
| `image/originalHeight` | float | 0       | Original image height before any crop |

These are set once when the image is loaded and never modified by crop operations.

### Crop Commit Flow

```
commitCrop()
  ├─ Read crop rect from overlay → { x, y, width, height }
  ├─ beginBatch()
  │   ├─ SetPropertyCommand(CROP_X, rect.x)
  │   ├─ SetPropertyCommand(CROP_Y, rect.y)
  │   ├─ SetPropertyCommand(CROP_WIDTH, rect.width)
  │   ├─ SetPropertyCommand(CROP_HEIGHT, rect.height)
  │   ├─ SetPropertyCommand(CROP_ENABLED, true)
  │   ├─ SetPropertyCommand(PAGE_WIDTH, rect.width)   ← NEW
  │   └─ SetPropertyCommand(PAGE_HEIGHT, rect.height)  ← NEW
  ├─ endBatch()
  ├─ setEditMode('Transform')
  └─ fitToScreen()  ← NEW (re-center after resize)
```

### Crop Overlay Setup (Re-entering Crop Mode)

```
#setupCropOverlay(blockId)
  ├─ Read IMAGE_ORIGINAL_WIDTH / IMAGE_ORIGINAL_HEIGHT  ← NEW (full image bounds)
  ├─ imageRect = { x: 0, y: 0, width: originalW, height: originalH }
  ├─ Read CROP_X/Y/WIDTH/HEIGHT/ENABLED (current crop within original)
  ├─ initialCrop = { x: cropX, y: cropY, width: cropW, height: cropH }
  └─ renderer.showCropOverlay(blockId, imageRect, initialCrop)
```

### Renderer (No Change Needed)

`#updatePageNode` already applies `imgNode.crop({ x, y, width, height })` and sets `imgNode.width(pageW)` / `imgNode.height(pageH)`. After the page resize, `pageW === cropW` and `pageH === cropH`, so Konva renders the cropped source region into a matching-size node — 1:1 pixel-perfect.

## Implementation Steps

### Step 1: Add property keys and defaults

**Files**: `property-keys.ts`, `block-defaults.ts`, `block/index.ts`

- Add `IMAGE_ORIGINAL_WIDTH = 'image/originalWidth'` and `IMAGE_ORIGINAL_HEIGHT = 'image/originalHeight'`
- Add defaults of `0` for both in `page` and `image` block types
- Export from index

### Step 2: Store original dimensions on image load

**Files**: `block-api.ts`, `image-editor.tsx`

- Add `setPageImageOriginalDimensions(blockId, width, height)` to `BlockAPI`
- In `image-editor.tsx`, after `ce.block.setPageImageSrc(pageId, workingUrl)`, call `ce.block.setPageImageOriginalDimensions(pageId, workingWidth, workingHeight)`

### Step 3: Update `commitCrop()` to resize page

**File**: `editor.ts`

- After writing crop properties, add `SetPropertyCommand` for `PAGE_WIDTH = rect.width` and `PAGE_HEIGHT = rect.height` inside the same batch

### Step 4: Update `#setupCropOverlay` to use original dimensions

**File**: `editor.ts`

- Read `IMAGE_ORIGINAL_WIDTH` / `IMAGE_ORIGINAL_HEIGHT` instead of `PAGE_WIDTH` / `PAGE_HEIGHT` for the `imageRect`
- Fall back to `PAGE_WIDTH/HEIGHT` if original dimensions are 0 (backward compat)

### Step 5: Re-fit camera after commit

**File**: `image-editor.tsx`

- In `handleCropApply`, after `ce.editor.commitCrop()`, call `ce.editor.fitToScreen()`

### Step 6: Add `resetCrop()` method

**File**: `editor.ts`

- Reads `IMAGE_ORIGINAL_WIDTH/HEIGHT` from the block
- Restores `PAGE_WIDTH/HEIGHT` to original values
- Clears `CROP_ENABLED`, zeros `CROP_X/Y/WIDTH/HEIGHT`
- All in a single undo batch

### Step 7: Update tests

**Files**: `editor.test.ts`, `image-editor.test.tsx`

- Verify `commitCrop` sets `PAGE_WIDTH/HEIGHT` to crop dimensions
- Verify re-entering crop uses original dimensions as image rect
- Verify undo restores both page and crop properties
- Verify `resetCrop` restores original dimensions

## Undo/Redo

All crop + page-resize commands are in a single `beginBatch()` / `endBatch()` group. A single `undo()` call reverts everything atomically — the page returns to its pre-crop dimensions and the crop properties clear.

## Comparison

| Aspect               | Before                      | After (img.ly-style)       |
| -------------------- | --------------------------- | -------------------------- |
| Page dims after crop | Unchanged                   | Resized to crop area       |
| Image rendering      | Stretched/distorted         | 1:1 pixel-perfect          |
| Re-entering crop     | Constrained to current page | Full original image        |
| Undo                 | Reverts crop props only     | Reverts crop + page dims   |
| Original dims        | Not stored                  | Stored as block properties |

## Edge Cases

- **First crop**: Original dims = page dims. After crop, page shrinks.
- **Re-crop**: Overlay shows full original. User can expand beyond previous crop.
- **Undo after crop**: Page and crop restore to pre-crop state.
- **Multiple sequential crops**: Each reads from the same original dims (never modified by crop).
- **Image load without crop**: Original dims set, `CROP_ENABLED = false`, page = full image size.
- **Reset crop**: Page restores to original dims, crop cleared.
