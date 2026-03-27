# Feature 3: Rotate and Flip

**Status:** in progress

## User Story

As a user, I click the Rotate tool in the toolbar. A side panel appears with a rotation slider (-180° to +180°), two ±90° buttons, and Flip X / Flip Y buttons. I drag the slider to rotate the image continuously; the canvas updates in real time. I click ±90° to snap to right angles. I click Flip X or Flip Y to mirror the image. All transforms are non-destructive and undoable. Rotation and flip compose correctly with an existing crop.

## Scenarios

### Rotation via slider

1. User clicks "Rotate" in toolbar
2. Side panel appears with a slider (range: -180° to +180°, step 1°)
3. User drags the slider → image rotates in real time
4. Releasing the slider commits the rotation as an undoable operation

### ±90° rotation

1. User clicks the +90° button → image rotates clockwise by 90°
2. User clicks the -90° button → image rotates counter-clockwise by 90°
3. Each click is a discrete undo step

### Flip

1. User clicks Flip X → image mirrors horizontally
2. User clicks Flip Y → image mirrors vertically
3. Each flip toggles the current state (double flip = identity)
4. Each click is a discrete undo step

### Compose with crop

1. User crops the image (Feature 2), then opens Rotate tool
2. Rotation and flip apply to the already-cropped result
3. Undo works correctly: undo rotation first, then undo crop separately

### Reset rotation

1. "Reset" button in the panel restores rotation=0, flipX=false, flipY=false
2. Single undo step that reverts all three

## Architecture Decision

In filerobot, rotation and flip are stored as separate global `adjustments` properties (not under crop). In the editx engine's block model, we use the existing `CROP_ROTATION`, `CROP_FLIP_HORIZONTAL`, and `CROP_FLIP_VERTICAL` properties — these are already on the block and wired into the Konva node factory's flip rendering. However, rotation via `CROP_ROTATION` is NOT currently rendered by the node factory.

**Decision:** Add a new `IMAGE_ROTATION` property for the rotate tool's continuous rotation (degrees). Keep `CROP_FLIP_HORIZONTAL/VERTICAL` for flip (already rendered). This separation allows:

- `IMAGE_ROTATION` = the user-facing rotation angle (applied to the page/image layer)
- `CROP_ROTATION` = reserved for future crop-internal rotation (e.g., straighten within crop overlay)

## Engine Gaps

### 1. No image rotation property

The engine has `transform/rotation` (generic block rotation) and `crop/rotation` but no dedicated image-level rotation that composes with crop and resizes the page.

### 2. No rotation rendering

The Konva node factory does not apply `image/rotation` to the page node's image.

### 3. No rotation math utilities

Need utilities to compute the bounding box after rotation (AABB) and center-based rotation offsets.

### 4. No page resize after rotation

When rotating by non-90° angles, the page bounding box changes. For 90° increments, width and height simply swap.

## Engine Changes

### A. New property keys

```ts
// property-keys.ts
export const IMAGE_ROTATION = "image/rotation" as const; // degrees, range [-180, 180]
```

### B. Block defaults

Add `IMAGE_ROTATION: 0` to both `page` and `image` block defaults.

### C. Rotation math utilities (`utils/rotation-math.ts`)

```ts
/** Compute the axis-aligned bounding box of a rectangle after rotation. */
export function getSizeAfterRotation(
  width: number,
  height: number,
  angleDeg: number,
): { width: number; height: number };

/** Restrict a number to [min, max]. */
export function clampRotation(angle: number): number; // clamps to [-180, 180]
```

Reference: filerobot's `getSizeAfterRotation.js`

### D. Page rendering with rotation

In `KonvaNodeFactory.#updatePageNode`:

1. Read `IMAGE_ROTATION` from block properties
2. When rotation is non-zero:
   - Set the Konva image node's `rotation` property
   - Set `offsetX/Y` to center of image (so rotation happens around center)
   - Reposition the image to compensate for the offset
3. Rotation composes with existing flip transforms

The page Group itself stays axis-aligned. The rotation is applied to the image node inside.

### E. EditorAPI rotation methods

```ts
/** Rotate the image on the given block (or active page). */
setImageRotation(blockId: number, angleDeg: number): void;

/** Get the current image rotation. */
getImageRotation(blockId: number): number;

/** Rotate by 90° clockwise. Swaps page dimensions. */
rotateClockwise(blockId?: number): void;

/** Rotate by 90° counter-clockwise. Swaps page dimensions. */
rotateCounterClockwise(blockId?: number): void;

/** Flip the image horizontally. */
flipHorizontal(blockId?: number): void;

/** Flip the image vertically. */
flipVertical(blockId?: number): void;

/** Reset rotation and flip to defaults. Single undo batch. */
resetRotationAndFlip(blockId?: number): void;
```

### F. 90° rotation page resize

When rotating by exactly ±90°, the page dimensions swap:

```
PAGE_WIDTH ↔ PAGE_HEIGHT
```

This is a batch operation (rotation + page resize) for atomic undo.

## Image Editor Changes

### A. Rotate panel (`components/panels/rotate-panel.tsx`)

Layout:

```
┌─────────────────────────────┐
│  ↺ -90°              +90° ↻ │
│  ┌─────────────────────────┐ │
│  │  -180° ────●──── +180° │ │  ← slider
│  └─────────────────────────┘ │
│         Current: 15°         │
│                              │
│  ╔══════════╗ ╔══════════╗  │
│  ║  Flip X  ║ ║  Flip Y  ║  │
│  ╚══════════╝ ╚══════════╝  │
│                              │
│       [ Reset ]              │
└─────────────────────────────┘
```

- Rotation slider: range [-180, 180], step 1
- ±90° buttons
- Flip X / Flip Y toggle buttons
- Reset button
- Current angle display

### B. Tool activation wiring

In `handleToolChange`, when `tool === 'rotate'`:

- Set store `activeTool` to `'rotate'`
- Show the rotate panel (conditional render, same pattern as crop)
- No special engine mode needed (rotate/flip are direct property changes)

### C. Real-time rotation preview

As the user drags the slider:

1. Call `ce.block.setFloat(editableBlockId, IMAGE_ROTATION, angle)` on every slider change
2. The engine marks the block dirty → `syncBlock` → node factory applies rotation
3. Canvas updates in real time

On slider release (commit):

- The property change is already in history via `SetPropertyCommand`

## Filerobot Reference Files

| Filerobot File             | Purpose                         | Adapt For                       |
| -------------------------- | ------------------------------- | ------------------------------- |
| `RotateOptions.jsx`        | Slider + ±90° buttons UI        | Rotate panel component          |
| `FlipX.jsx` / `FlipY.jsx`  | Flip toggle buttons             | Flip buttons in rotate panel    |
| `getSizeAfterRotation.js`  | AABB after rotation             | Rotation math utility           |
| `getCenterRotatedPoint.js` | Center-based rotation offset    | Konva node positioning          |
| `changeRotation.js`        | Rotation state reducer          | Engine property mutation        |
| `toggleFlip.js`            | Flip state reducer              | Engine flip toggle              |
| `DesignLayerWrapper.jsx`   | Applies rotation to Konva layer | Node factory rotation rendering |
| `LayersBackground.jsx`     | Applies flip via scaleX/Y: -1   | Already adapted in node factory |

## Implementation Steps

### Step 1: Add property key and defaults

- Add `IMAGE_ROTATION` to `property-keys.ts`
- Add `IMAGE_ROTATION: 0` to page and image block defaults
- Export from index

### Step 2: Rotation math utilities

- Create `packages/engine/src/utils/rotation-math.ts` with `getSizeAfterRotation`, `clampRotation`
- Unit tests in `rotation-math.test.ts`

### Step 3: Rotation rendering in node factory

- In `#updatePageNode`, read `IMAGE_ROTATION` and apply to the image node
- Handle center-based rotation (offsetX/Y + repositioning)
- Compose with existing flip transforms

### Step 4: EditorAPI rotation/flip methods

- Add `setImageRotation`, `getImageRotation`, `rotateClockwise`, `rotateCounterClockwise`
- Add `flipHorizontal`, `flipVertical`, `resetRotationAndFlip`
- 90° rotation swaps page dims in a batch

### Step 5: Rotate panel UI

- Create `rotate-panel.tsx` with slider, ±90° buttons, flip buttons, reset
- Style with Tailwind

### Step 6: Wire up in image-editor

- Handle 'rotate' tool in `handleToolChange`
- Conditional render of `RotatePanel` when `activeTool === 'rotate'`
- Pass engine callbacks to panel

### Step 7: Tests

- Rotation math unit tests
- Block property round-trip tests
- EditorAPI rotation tests (90° swaps dims, undo restores)
- Rotate panel component tests
- Image-editor integration test for rotate flow

## Testing Phase

### Unit Tests

| Test File                                 | What to Test                                   |
| ----------------------------------------- | ---------------------------------------------- |
| `engine/src/utils/rotation-math.test.ts`  | `getSizeAfterRotation` at 0°, 45°, 90°, 180°   |
| `engine/src/utils/rotation-math.test.ts`  | `clampRotation` clamping and wrapping          |
| `engine/src/block/block-defaults.test.ts` | IMAGE_ROTATION default is 0 for page and image |

### Engine Tests

| Test File                   | What to Test                                                       |
| --------------------------- | ------------------------------------------------------------------ |
| `engine/src/editor.test.ts` | `rotateClockwise` swaps page dims + updates IMAGE_ROTATION         |
| `engine/src/editor.test.ts` | `rotateCounterClockwise` swaps page dims correctly                 |
| `engine/src/editor.test.ts` | `flipHorizontal` / `flipVertical` toggles the property             |
| `engine/src/editor.test.ts` | `resetRotationAndFlip` restores all to defaults, single undo batch |
| `engine/src/editor.test.ts` | Undo after 90° rotation restores original page dims                |

### Component Tests

| Test File                                                  | What to Test                          |
| ---------------------------------------------------------- | ------------------------------------- |
| `image-editor/src/components/panels/rotate-panel.test.tsx` | Renders slider, buttons, flip buttons |
| `image-editor/src/components/panels/rotate-panel.test.tsx` | Slider change calls rotation callback |
| `image-editor/src/components/panels/rotate-panel.test.tsx` | ±90° buttons call rotation callback   |
| `image-editor/src/components/panels/rotate-panel.test.tsx` | Flip buttons call flip callbacks      |
| `image-editor/src/components/panels/rotate-panel.test.tsx` | Reset calls reset callback            |

## Acceptance Criteria

- [ ] Clicking "Rotate" shows the rotate panel
- [ ] Slider rotates the image continuously from -180° to +180°
- [ ] ±90° buttons snap rotation in 90° increments
- [ ] 90° rotation swaps page dimensions
- [ ] Flip X mirrors the image horizontally
- [ ] Flip Y mirrors the image vertically
- [ ] Reset restores rotation=0, flipX=false, flipY=false
- [ ] All operations are undoable
- [ ] Rotation composes correctly with existing crop
- [ ] Canvas updates in real time during slider drag
