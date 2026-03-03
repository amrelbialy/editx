# Feature 2: Crop

**Status:** implemented

## Summary of Implementation

### Files Created

- `packages/engine/src/utils/crop-math.ts` — Pure crop math: `toPrecisedFloat`, `compareRatios`, `CROP_PRESETS`, `constrainCropToImage`, `applyCropRatio`, `boundDragging`, `boundResizing`, `mapCropToOriginal`
- `packages/engine/src/utils/crop-math.test.ts` — 36 unit tests for all crop math functions
- `packages/engine/src/konva/konva-crop-overlay.ts` — `KonvaCropOverlay` class with destination-out compositing, Transformer with ratio/anchor control
- `packages/image-editor/src/components/panels/crop-panel.tsx` — Preset selector with 7 ratios
- `packages/image-editor/src/components/panels/crop-panel.test.tsx` — 4 component tests
- `packages/image-editor/src/components/crop-action-bar.tsx` — Apply/Cancel bar
- `packages/image-editor/src/components/crop-action-bar.test.tsx` — 4 component tests

### Files Modified

- `packages/engine/src/block/property-keys.ts` — Added `CROP_X`, `CROP_Y`, `CROP_WIDTH`, `CROP_HEIGHT`, `CROP_ENABLED`
- `packages/engine/src/block/block-defaults.ts` — Image block includes crop defaults
- `packages/engine/src/render-adapter.ts` — 4 crop overlay methods + `onCropChange` callback
- `packages/engine/src/editor.ts` — EditorAPI delegates crop methods to renderer
- `packages/engine/src/konva/konva-renderer-adapter.ts` — Instantiates and wires `KonvaCropOverlay`
- `packages/engine/src/konva/konva-node-factory.ts` — `imgNode.crop()` when `crop/enabled` is true
- `packages/engine/src/index.ts` — Exports crop keys and crop-math functions
- `packages/image-editor/src/store/image-editor-store.ts` — `cropPreset`, `cropRect`, actions
- `packages/image-editor/src/image-editor.tsx` — Full crop tool flow (activation effect, preset handler, apply/cancel, conditional rendering)
- `packages/image-editor/src/image-editor.test.tsx` — Mock engine updated with crop methods
- `packages/engine/src/block/block-defaults.test.ts` — Crop default assertions
- `packages/engine/src/block/block-api.test.ts` — Crop property get/set + undo/redo + batch tests
- `packages/image-editor/src/store/image-editor-store.test.ts` — Crop state tests

### Test Results

- Engine: 279 tests passing (15 files) — includes 36 crop-math + 5 crop property tests
- Image Editor: 92 tests passing (9 files) — includes 8 component tests + 6 store crop tests

## User Story

As a user, I click the Crop tool in the toolbar. A crop overlay appears on the image with drag handles. I can resize and reposition the crop area. I can choose preset aspect ratios (Free, 1:1, 4:3, 16:9, 9:16). When I confirm, the visible area of the image is limited to the crop region. The crop is non-destructive and undoable.

## Scenarios

### Basic Crop

1. User clicks "Crop" in toolbar
2. Crop overlay appears covering the full image, with a darkened area outside
3. User drags corner/edge handles to resize the crop area
4. User drags inside the crop area to reposition it
5. Crop area is constrained to stay within image bounds
6. User clicks "Apply" to confirm, or "Cancel" to discard

### Preset Ratios

1. User clicks a ratio preset (e.g., 16:9)
2. Crop area snaps to that ratio, centered on the image
3. Corner handles maintain the aspect ratio while resizing
4. Edge handles are disabled (only corner handles for ratio-locked crops)

### Free Crop

1. User selects "Free" preset
2. All handles are enabled (corners + edges)
3. No ratio constraint

## Engine Gaps

### 1. No crop data model

The engine has no way to represent a crop region on a block. Need crop properties stored on the image block.

### 2. No clip/mask rendering

The Konva adapter has no clip function to visually restrict rendering to the crop area.

### 3. No tool mode system

The engine needs a way to signal "currently in crop mode" so the renderer can show/hide the crop overlay and modify transformer behavior.

### 4. No crop overlay rendering

Need to render the dark overlay + crop handles as a separate UI layer element during crop mode.

## Engine Changes

### A. Crop properties on image blocks

Add these properties to the image block:

- `crop/x` (float) -- x offset of crop area relative to image top-left
- `crop/y` (float) -- y offset of crop area
- `crop/width` (float) -- width of crop area
- `crop/height` (float) -- height of crop area
- `crop/enabled` (bool) -- whether crop is active

Update `block-defaults.ts`:

```ts
image: {
  ...SHARED_TRANSFORM,
  ...SHARED_APPEARANCE,
  'image/src': '',
  'crop/x': 0,
  'crop/y': 0,
  'crop/width': 0,    // 0 = full image (no crop)
  'crop/height': 0,
  'crop/enabled': false,
};
```

### B. Clip rendering in Konva adapter

When `crop/enabled` is true and crop dimensions are non-zero, apply a clip function to the `Konva.Image` node:

```ts
imgNode.clipFunc((ctx) => {
  ctx.rect(cropX, cropY, cropWidth, cropHeight);
});
```

Also offset the image position so the crop region appears at the block's position, and adjust the visible size to match the crop dimensions.

### C. Crop overlay in Konva adapter

Add a `showCropOverlay(blockId, cropRect)` / `hideCropOverlay()` method to the `RendererAdapter` interface.

The overlay consists of:

1. A semi-transparent dark rect covering the full image
2. A "cutout" rect (using `globalCompositeOperation: 'destination-out'`) to reveal the crop area
3. A Konva.Transformer attached to the cutout rect with configurable anchors

This follows the exact pattern from filerobot's `CropTransformer.jsx`.

### D. Crop-specific transformer behavior

When in crop mode, the transformer should:

- Not rotate
- Constrain to the image bounds (`boundBoxFunc`)
- Support ratio locking (only corner anchors when ratio is locked)
- Be draggable within the image bounds

## Image Editor Changes

### A. Crop tool activation

When user clicks "Crop" in toolbar:

1. `useImageEditorStore.setActiveTool('crop')`
2. Renderer shows crop overlay on the image block
3. Toolbar updates to show crop presets (sub-toolbar)
4. Bottom bar shows Apply/Cancel buttons

### B. Crop presets sub-toolbar (`components/panels/crop-panel.tsx`)

Shows ratio presets:

- Free (custom) -- all anchors, no ratio lock
- Original -- locks to image's natural aspect ratio
- 1:1 (square)
- 4:3 (landscape)
- 3:4 (portrait)
- 16:9 (widescreen)
- 9:16 (vertical)

### C. Crop overlay interaction

The crop rectangle is a Konva.Rect in the UI layer that:

- Can be dragged within the image bounds
- Can be resized via transformer handles
- Maintains ratio when a preset is selected
- Updates crop properties on the block in real-time (for preview)

### D. Apply / Cancel

- **Apply**: The crop properties are committed to the block. The renderer clips the image. History entry is created.
- **Cancel**: Crop properties are reverted to previous values. Overlay is hidden.

## Filerobot Reference Files

| Filerobot File               | Purpose                                                                    | Adapt For                    |
| ---------------------------- | -------------------------------------------------------------------------- | ---------------------------- |
| `CropTransformer.jsx`        | Crop overlay + transformer with dark background, cutout, ratio constraints | Konva adapter crop overlay   |
| `TransformersLayer.utils.js` | `boundDragging()` and `boundResizing()` -- constrain crop within image     | Crop constraint math         |
| `Crop.constants.js`          | Default crop presets (custom, original, 16:9, 9:16, ellipse)               | Preset definitions           |
| `CropPresetsOption.jsx`      | Preset selector UI with folders                                            | Crop panel UI                |
| `setCrop.js`                 | Reducer for crop state (x, y, width, height, ratio)                        | Engine crop properties       |
| `cropImage.js`               | Clip function (rect or ellipse)                                            | Renderer clip implementation |
| `mapCropBox.js`              | Map crop coordinates between displayed and actual image dimensions         | Coordinate mapping utility   |
| `toPrecisedFloat.js`         | Round floats for stable comparison                                         | Utility                      |
| `compareRatios.js`           | Compare aspect ratios with tolerance                                       | Utility                      |

## Implementation Steps

### Step 1: Engine -- Add crop properties to image block defaults

- Update `block-defaults.ts` with crop properties
- No schema changes needed (properties bag is dynamic)

### Step 2: Engine -- Add RendererAdapter crop overlay API

- Add `showCropOverlay(blockId: number, imageRect: { x, y, width, height }): void` to `RendererAdapter`
- Add `hideCropOverlay(): void`
- Add `setCropRect(rect: { x, y, width, height }): void`
- Add `onCropChange?: (rect: { x, y, width, height }) => void` callback

### Step 3: Engine -- Implement crop overlay in Konva adapter

- Create crop overlay group (dark background + cutout shape + transformer)
- Handle drag/resize events, call `onCropChange` callback
- Support ratio locking via transformer `keepRatio` + `enabledAnchors`
- Implement `boundBoxFunc` and `boundDragging` to constrain within image

### Step 4: Engine -- Implement clip rendering for committed crops

- In `#updateNode()` for image blocks, apply `clipFunc` when `crop/enabled` is true
- Adjust image position/size to show only the cropped region

### Step 5: Image Editor -- Crop panel component

- Create `components/panels/crop-panel.tsx` with preset buttons
- Wire preset selection to crop overlay ratio locking

### Step 6: Image Editor -- Crop tool flow

- On crop tool activation: read current image dimensions, show crop overlay
- On crop change: update live preview (through `onCropChange` callback)
- On Apply: commit crop properties to engine block, hide overlay, create history entry
- On Cancel: discard changes, hide overlay

### Step 7: Image Editor -- Apply/Cancel bar

- Create a bottom action bar component that appears during crop mode
- Apply button commits, Cancel button reverts

### Step 8: Integration test

- Activate crop tool, resize handles, verify overlay
- Select preset ratio, verify constraint
- Apply crop, verify image clips correctly
- Undo, verify crop reverts

## Testing Phase

### Unit Tests

Target: Crop math, constraints, and property logic in isolation.

| Test File                                           | What to Test                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `engine/src/__tests__/block-defaults.test.ts`       | Image block defaults include crop properties (`crop/x`, `crop/y`, `crop/width`, `crop/height`, `crop/enabled`) |
| `engine/src/utils/crop-math.test.ts`                | `constrainCropToImage()` clamps crop rect within image bounds                                                  |
| `engine/src/utils/crop-math.test.ts`                | `applyCropRatio()` applies 1:1, 4:3, 16:9, 9:16 correctly centered                                             |
| `engine/src/utils/crop-math.test.ts`                | `applyCropRatio()` with "Original" uses the image's natural aspect ratio                                       |
| `engine/src/utils/crop-math.test.ts`                | `applyCropRatio()` with "Free" does not modify the crop rect                                                   |
| `engine/src/utils/crop-math.test.ts`                | `boundResizing()` keeps crop within image bounds during resize                                                 |
| `engine/src/utils/crop-math.test.ts`                | `boundDragging()` prevents crop from being dragged outside image                                               |
| `image-editor/src/store/image-editor-store.test.ts` | `setActiveTool('crop')` updates `activeTool` to `'crop'`                                                       |
| `image-editor/src/store/image-editor-store.test.ts` | `setCropPreset('16:9')` stores the selected ratio                                                              |

### Component Tests

Target: UI behavior using React Testing Library.

| Test File                                                | What to Test                                                           |
| -------------------------------------------------------- | ---------------------------------------------------------------------- |
| `image-editor/src/components/panels/crop-panel.test.tsx` | Renders all preset buttons (Free, Original, 1:1, 4:3, 3:4, 16:9, 9:16) |
| `image-editor/src/components/panels/crop-panel.test.tsx` | Clicking a preset button calls the store's `setCropPreset`             |
| `image-editor/src/components/panels/crop-panel.test.tsx` | Selected preset is visually highlighted                                |
| `image-editor/src/components/crop-action-bar.test.tsx`   | Renders Apply and Cancel buttons when crop mode is active              |
| `image-editor/src/components/crop-action-bar.test.tsx`   | Apply button calls the commit handler                                  |
| `image-editor/src/components/crop-action-bar.test.tsx`   | Cancel button calls the revert handler                                 |

### Integration Tests

Target: Engine + Renderer + Store working together for the full crop flow.

| Test File                                     | What to Test                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------- |
| `engine/src/__tests__/crop-overlay.test.ts`   | `showCropOverlay()` creates the overlay group (dark background + cutout + transformer) |
| `engine/src/__tests__/crop-overlay.test.ts`   | `hideCropOverlay()` removes the overlay group from the stage                           |
| `engine/src/__tests__/crop-overlay.test.ts`   | Resizing the crop transformer fires `onCropChange` with the new rect                   |
| `engine/src/__tests__/crop-overlay.test.ts`   | Ratio-locked transformer only allows corner anchors                                    |
| `engine/src/__tests__/crop-rendering.test.ts` | Setting `crop/enabled: true` with crop dimensions clips the Konva.Image node           |
| `engine/src/__tests__/crop-rendering.test.ts` | Clipped image position/size reflects the crop region                                   |
| `engine/src/__tests__/crop-rendering.test.ts` | Undo after crop apply restores original crop properties and removes clip               |
| `image-editor/src/image-editor.test.tsx`      | Activating crop tool → adjusting crop → Apply → image is visually cropped              |
| `image-editor/src/image-editor.test.tsx`      | Activating crop tool → Cancel → no changes to the image                                |

### When to Run

- **Unit tests**: On every save / pre-commit hook
- **Component tests**: On every PR / before merging
- **Integration tests**: On every PR / before merging (these are the most critical for crop correctness)

## Acceptance Criteria

- [x] Clicking "Crop" shows the crop overlay on the image
- [x] Drag handles resize the crop area
- [x] Dragging inside the crop area repositions it
- [x] Crop area stays within image bounds
- [x] Selecting a ratio preset constrains the crop
- [x] "Apply" clips the image to the crop area
- [x] "Cancel" reverts without changes
- [x] Undo after apply restores the uncropped image
- [x] Crop is non-destructive (original image data preserved)
