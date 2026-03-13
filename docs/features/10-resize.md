# Feature 10: Resize (Crop Panel Tab)

**Status:** in progress

## TL;DR

Add a **"Resize"** tab to the existing Crop panel (img.ly CE.SDK style). Users can enter exact pixel dimensions or pick social-media size presets (Instagram, Facebook, TikTok, YouTube). The crop overlay adjusts to the requested size and on apply, the page resizes to match. No new standalone tool — resize is a crop mode.

## User Story

As a social-media manager, I want to crop my photo to the exact pixel dimensions required by Instagram, Facebook or TikTok, so I can export platform-ready images without guessing.

## Scenarios

1. **Enter Crop → switch to Resize tab:** User clicks Crop → panel shows "Aspect Ratio" tab (existing). Clicks "Resize" tab → sees Width/Height inputs populated with the current crop dimensions + platform presets below.

2. **Pick a preset:** User clicks "Instagram Portrait Post (1080 × 1350)" → Width input shows 1080, Height shows 1350. Crop overlay on canvas updates to that exact rectangle, centered on the image. Aspect ratio locks to 1080:1350.

3. **Type custom dimensions:** User types 800 in Width. Ratio is locked, so Height auto-computes to maintain the current ratio. Crop overlay resizes accordingly.

4. **Unlock ratio:** User clicks the lock icon → ratio lock releases. Now Width and Height are independent. User types 800 × 600 freely.

5. **Overlay ↔ inputs sync:** User drags the crop handles on canvas → Width/Height inputs update in real-time. User types in inputs → overlay updates.

6. **Apply:** User clicks "Done" in the contextual bar → crop commits, page resizes to the exact pixel dimensions, camera fits the new page.

7. **Cancel:** User presses Escape or clicks × on the panel → crop reverts (undo), page stays at previous dimensions.

8. **Switch back to Aspect Ratio tab:** User switches from Resize to Aspect Ratio → crop overlay stays as-is. User can pick a ratio preset and the overlay adjusts by ratio (not pixels).

## Reference Analysis

### img.ly CE.SDK

- Crop panel has two tabs: "Aspect Ratio" and "Resize"
- Resize tab: Width/Height px inputs + ratio lock toggle + platform preset groups
- Presets grouped by platform: Instagram, Facebook, TikTok — each shows 3 items, "More (N)" expands
- Each preset shows platform icon + label + aspect ratio in parentheses
- Selecting a preset sets the crop overlay to those exact dimensions

### Filerobot

- Separate standalone Resize tool (different from img.ly approach)
- Width/Height inputs + ratio lock + reset button
- No platform presets
- Scales entire canvas (not crop-based)

**We follow the img.ly approach** — resize as a crop tab with platform presets.

## What Already Exists

- ✅ Crop overlay with drag/resize handles
- ✅ `applyCropRatio(blockId, ratio)` — sets crop to aspect ratio
- ✅ Crop commit → page resize to crop dimensions
- ✅ Undo/redo for crop operations
- ✅ `CropPanel` component with aspect ratio presets
- ✅ `useCropTool` hook with enter/exit/apply/cancel
- ❌ No `applyCropDimensions(blockId, width, height)` — set crop to exact pixels
- ❌ No `getCropVisualDimensions()` — read current crop as pixels
- ❌ No tab switcher in crop panel
- ❌ No width/height pixel inputs
- ❌ No platform size presets
- ❌ No ratio lock toggle in crop context

## Architecture

No new block types or properties. Resize operates on the existing crop system:

```
User enters pixels → applyCropDimensions(blockId, w, h)
  → compute largest crop rect of w×h that fits in image
  → center on current crop center
  → update crop overlay
  → on apply: crop commit writes PAGE_WIDTH/HEIGHT = visual crop dims
```

The crop overlay remains the source of truth. Resize inputs are a convenient way to set exact crop dimensions instead of dragging.

## Engine Changes

### 1. `EditorCrop.applyCropDimensions(width, height)`

New method in `editor-crop.ts`, similar to `applyCropRatio`:

1. Get image bounds from renderer (`getCropImageRect()`)
2. Clamp requested width/height to image bounds
3. Center new crop rect on current crop center
4. Lock overlay aspect ratio to `width/height`
5. Update overlay via `renderer.setCropRect()`
6. Re-fit camera to new crop area

### 2. `EditorCrop.getCropVisualDimensions()`

Returns `{ width, height }` of the current crop overlay in visual pixels (rounded to integers). Used by UI to populate Width/Height inputs.

### 3. `BlockAPI.applyCropDimensions(blockId, width, height)`

Public method that routes to `EditorCrop.applyCropDimensions()` via the same handler pattern as `applyCropRatio`.

### 4. `BlockAPI.getCropVisualDimensions(blockId)`

Public method that routes to `EditorCrop.getCropVisualDimensions()`.

## UI Changes

### 1. Crop Panel Tabs

Refactor `crop-panel.tsx`:

- Add toggle: "Aspect Ratio" | "Resize" (pill buttons, same style as img.ly screenshot)
- "Aspect Ratio" tab = existing preset grid (unchanged)
- "Resize" tab = new content below

### 2. Resize Tab Content

**Crop Area section:**

- Width number input with "px" suffix
- Height number input with "px" suffix
- Ratio lock toggle between them (Link/Unlink icon from Lucide)
- Inputs sync bidirectionally with crop overlay

**Preset groups section:**

- Groups: Instagram, Facebook, TikTok, YouTube, General
- Each shows first 3 presets, "More (N)" expands to all
- Each preset card: platform icon + label + dimensions
- Clicking preset → sets Width/Height + updates crop overlay

### 3. Hook Extensions

Extend `useCropTool`:

- `handleResizeDimensions(width, height)` — calls `block.applyCropDimensions()`
- `handleResizePreset(preset)` — sets dimensions from preset
- `getCropDimensions()` → `{ width, height }` from overlay
- Track `resizeRatioLocked` state
- Sync inputs when overlay is manually dragged

### 4. Config Types

```ts
interface ResizePreset {
  label: string;
  width: number;
  height: number;
}

interface ResizePresetGroup {
  label: string;
  presets: ResizePreset[];
}

// Added to CropToolConfig:
interface CropToolConfig {
  // ...existing...
  resizePresets?: ResizePresetGroup[];
}
```

## Constraints

- **Min dimensions:** 1px
- **Max dimensions:** original image bounds (can't crop larger than source)
- When ratio locked: changing one dimension auto-computes the other, then clamp both to image bounds
- Presets that exceed image bounds: clamp to largest possible rect with that aspect ratio

## Files Changed

**Engine:**

- `packages/engine/src/editor/editor-crop.ts` — `applyCropDimensions()`, `getCropVisualDimensions()`
- `packages/engine/src/block/block-api.ts` — expose new methods
- `packages/engine/src/creative-engine.ts` — wire handler (same pattern as applyCropRatio)
- `packages/engine/src/index.ts` — export if needed

**Image Editor:**

- `packages/image-editor/src/config/config.types.ts` — `ResizePreset`, `ResizePresetGroup`, extend `CropToolConfig`
- `packages/image-editor/src/config/default-config.ts` — platform preset defaults
- `packages/image-editor/src/components/panels/crop-panel.tsx` — add tabs + resize content
- `packages/image-editor/src/components/panels/resize-presets.tsx` — preset group component (new)
- `packages/image-editor/src/hooks/use-crop-tool.ts` — resize handlers + sync
- `packages/image-editor/src/image-editor.tsx` — wire new props to CropPanel
- `packages/image-editor/src/store/image-editor-store.ts` — add `cropTab` state if needed
