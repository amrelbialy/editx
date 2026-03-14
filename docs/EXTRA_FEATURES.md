# Extra Features — Post-Master-Plan Additions

This document tracks features, improvements, and fixes added after the [Master Plan](MASTER_PLAN.md) feature set was completed. Each entry references the same architecture and codebase conventions established in the master plan.

## References

- **Master Plan:** `docs/MASTER_PLAN.md`
- **Filerobot reference:** `temp/filerobot-image-editor/`
- **img.ly CE.SDK API Reference:**
  - **Block API:** https://img.ly/docs/cesdk/js/api/engine/classes/blockapi/
  - **Editor API:** https://img.ly/docs/cesdk/js/api/cesdk-js/classes/editorapi/
  - **Scene API:** https://img.ly/docs/cesdk/js/api/cesdk-js/classes/sceneapi/
  - **Creative Engine:** https://img.ly/docs/cesdk/js/api/engine/classes/creativeengine/

---

## Feature Tracker

| #   | Feature / Fix          | Status   | Engine Changes                                    | UI Changes                                            |
| --- | ---------------------- | -------- | ------------------------------------------------- | ----------------------------------------------------- |
| E1  | Zoom Dropdown Menu     | **done** | `fitToSelection()` on EditorViewport & EditorAPI  | Zoom dropdown with presets, fit modes, keyboard hints |
| E2  | Zoom Center Anchor Fix | **done** | `KonvaCamera.setZoom()` preserves viewport center | — (behavioral fix, no UI change)                      |
| E3  | Animated Zoom          | **done** | `animate` param on setZoom/fitToScreen/fitToRect  | All zoom actions animate with 200ms ease-out cubic    |

---

## E2 — Zoom Center Anchor Fix

### Problem

`KonvaCamera.setZoom()` only set the zoom level without adjusting the pan offset. This meant the zoom anchor was at world origin (0,0) — zooming in/out caused the viewport to drift toward the top-left corner instead of staying centered on the content.

**Reference:** img.ly CE.SDK zooms around the viewport center, keeping the content visually stable.

### Solution

Updated `setZoom()` to compute the world-space point at the viewport center _before_ the zoom change, then recompute the pan offset so the same world point stays at the viewport center _after_ the zoom change.

```
worldX = (viewportCenterX - pan.x) / oldZoom
worldY = (viewportCenterY - pan.y) / oldZoom
newPan.x = viewportCenterX - worldX * newZoom
newPan.y = viewportCenterY - worldY * newZoom
```

### Files Changed

| File                                        | Change                                                  |
| ------------------------------------------- | ------------------------------------------------------- |
| `packages/engine/src/konva/konva-camera.ts` | `setZoom()` now adjusts pan to preserve viewport center |

---

## E3 — Animated Zoom

### Problem

All zoom operations (zoom in/out, fit to screen, fit to selection, presets) applied instantly. This felt jarring compared to img.ly CE.SDK which smoothly animates zoom transitions.

### Solution

Added an `animate` parameter (default `false`) throughout the zoom API chain: `KonvaCamera` → `KonvaRendererAdapter` → `RenderAdapter` interface → `EditorViewport` → `EditorAPI`.

**Animation implementation** in `KonvaCamera.#animateTo()`:

- **Duration:** 200ms with ease-out cubic easing (`1 - (1 - t)^3`)
- **Cancellable:** Each new animation cancels any in-flight one, so rapid clicks feel responsive
- **Logical vs visual separation:** The logical state (`#zoom`, `#pan`) is set to the target immediately so `getZoom()` returns the final value right away (correct zoom labels). Only the visual layer positions/scales are interpolated through `requestAnimationFrame`.

All UI zoom callbacks in `image-editor.tsx` now pass `animate = true`.

### Files Changed

| File                                                  | Change                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `packages/engine/src/konva/konva-camera.ts`           | Added `#animateTo()` method, `animate` param on `setZoom`/`fitToScreen`/`fitToRect`/`centerOnRect` |
| `packages/engine/src/render-adapter.ts`               | Added optional `animate` param to interface                                                        |
| `packages/engine/src/konva/konva-renderer-adapter.ts` | Pass `animate` through to camera                                                                   |
| `packages/engine/src/editor/editor-viewport.ts`       | Pass `animate` through to renderer                                                                 |
| `packages/engine/src/editor/editor-api.ts`            | Pass `animate` through to viewport                                                                 |
| `packages/image-editor/src/image-editor.tsx`          | All zoom handlers now pass `animate = true`                                                        |

---

## E1 — Zoom Dropdown Menu

### Problem

The original zoom UI had only three bare controls: a zoom-out icon button, a label button (showing "Auto"), and a zoom-in icon button. Clicking the label just called `fitToScreen()`. There were no preset zoom levels, no "Fit Selection" option, and no visual cue for the current zoom percentage — the label always showed "Auto".

### Reference

- **Filerobot:** `temp/filerobot-image-editor/packages/react-filerobot-image-editor/src/components/buttons/ZoomButtons/` — dropdown menu with 10 presets (Fit, 100%, 25%–1000%).
- **Filerobot useZoom hook:** `temp/filerobot-image-editor/packages/react-filerobot-image-editor/src/hooks/useZoom.js`

### Solution

#### Engine

Added `fitToSelection(padding?)` to `EditorViewport` and `EditorAPI`:

- Computes the union bounding box of all currently-selected blocks (position + size).
- Delegates to the existing `renderer.fitToRect(bbox, padding)`.
- `KonvaCamera.fitToRect()` was already implemented — no camera changes needed.

#### UI — ZoomMenu component

Replaced the plain zoom label button with a `<ZoomMenu>` dropdown (Radix `DropdownMenu` primitives). The zoom-in and zoom-out icon buttons remain flanking the dropdown.

**Menu items:**

| Item          | Action                                     | Shortcut |
| ------------- | ------------------------------------------ | -------- |
| Auto-Fit Page | `fitToScreen(24)` — fit with 24px padding  |          |
| Fit Page      | `fitToScreen(0)` — fit with no padding     |          |
| Fit Selection | `fitToSelection()` — fit selected block(s) |          |
| _(separator)_ |                                            |          |
| 200% Zoom     | `setZoom(2.0 * fitScale)`                  |          |
| 100% Zoom     | `setZoom(fitScale)` (1:1 pixel mapping)    | ⇧2       |
| 50% Zoom      | `setZoom(0.5 * fitScale)`                  |          |
| _(separator)_ |                                            |          |
| Zoom In       | Multiply zoom by 1.25×                     | +        |
| Zoom Out      | Multiply zoom by 0.8×                      | -        |

**Zoom label:** Shows the current zoom percentage (e.g. "41%") next to a chevron icon. The percentage is computed relative to the image's natural size — 100% means each image pixel maps to one screen pixel.

**Fit Selection** is disabled when no block is selected.

#### Keyboard Shortcuts

- `+` / `=` — Zoom in (existing)
- `-` — Zoom out (existing)
- `0` — Fit to screen (existing)
- `Shift+2` — 100% zoom (actual pixel size) — **new**

### Files Changed

| File                                                       | Change                                          |
| ---------------------------------------------------------- | ----------------------------------------------- |
| `packages/engine/src/editor/editor-viewport.ts`            | Added `fitToSelection()` method                 |
| `packages/engine/src/editor/editor-api.ts`                 | Exposed `fitToSelection()` (one-liner delegate) |
| `packages/image-editor/src/components/shell/zoom-menu.tsx` | **New** — ZoomMenu dropdown component           |
| `packages/image-editor/src/components/shell/topbar.tsx`    | Integrated ZoomMenu, updated props              |
| `packages/image-editor/src/image-editor.tsx`               | Wired zoom callbacks, zoom mode tracking        |
| `packages/image-editor/src/hooks/use-shortcuts.ts`         | Added `onZoom100` action + `Shift+2` shortcut   |
