# Editx -- Image Editor Plugin Master Plan

This document tracks the incremental build of a new image editor plugin on top of the editx engine. Each feature is developed as a real-life scenario, and the engine is evolved alongside to support it.

## Architecture

```
packages/image-editor        -- Image editor React component + tool plugins
packages/engine              -- Core engine (blocks, commands, history, renderer)
packages/react-editor        -- Shared hooks / utilities (reused by image-editor)
apps/demo                    -- Demo app consuming the image editor
```

The image editor composes the engine with an image-editing-specific workflow:

- Load a source image
- Apply non-destructive edits (crop, rotate, adjust, filter, annotate)
- Export the result

Reference: filerobot image editor in `temp/filerobot-image-editor/`.

### img.ly CE.SDK API Reference

We are simulating the img.ly editx engine SDK APIs. Use these as reference for designing our engine's public surface:

- **Block API:** https://img.ly/docs/cesdk/js/api/engine/classes/blockapi/
- **Editor API:** https://img.ly/docs/cesdk/js/api/cesdk-js/classes/editorapi/
- **Scene API:** https://img.ly/docs/cesdk/js/api/cesdk-js/classes/sceneapi/
- **editx engine:** https://img.ly/docs/cesdk/js/api/engine/classes/EditxEngine/

---

## Feature Status Tracker

| #   | Feature                  | Status                          | Engine Changes                                                    | UI Changes                                   | Doc                                     |
| --- | ------------------------ | ------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| 1   | Load Image onto Canvas   | **done** (improvements pending) | image block rendering, image/src property, async loading          | ImageEditor component, src prop              | `docs/features/01-load-image.md`        |
| 2   | Crop                     | **done**                        | crop properties, clip/mask, tool-mode, page resize, original dims | crop tool UI, presets, overlay, apply/cancel | `docs/features/02-crop.md`              |
| 3   | Rotate and Flip          | **done**                        | flip properties, rotation composition                             | rotate slider, flip buttons                  | `docs/features/03-rotate-flip.md`       |
| 4   | Adjustments (Full Suite) | **done**                        | adjustment properties (12 params), Konva filter pipeline          | adjustment panel with Basic & Refinements    | `docs/features/04-adjustments.md`       |
| 5   | Filters (Presets)        | **done**                        | filter effect type, 20 presets, preset registry                   | filter gallery panel                         | `docs/features/05-filters.md`           |
| 6   | Shapes (annotations)     | **done**                        | polygon/line/arrow kinds, points property                         | shape tools, options                         | `docs/features/06-shapes.md`            |
| 7   | Text Annotations         | **done**                        | expanded text properties, inline edit                             | text tool, styling panel                     | `docs/features/07-text.md`              |
| 8   | Image Annotations        | **done**                        | image overlay block, sticker placement, transform                 | image annotation panel, upload/gallery       | `docs/features/08-image-annotations.md` |
| 9   | Pen / Freehand Drawing   | not started                     | path block kind, points array                                     | pen tool, brush options                      | `docs/features/09-pen.md`               |
| 10  | Resize                   | **done**                        | applyCropDimensions, getCropVisualDimensions                      | crop panel resize tab, platform presets      | `docs/features/10-resize.md`            |
| 11  | Export                   | **in progress**                 | export API, offscreen render                                      | save button, format options                  | `docs/features/11-export.md`            |

---

## Codebase Refactoring

**Status:** not started | **Doc:** `docs/REFACTORING_PLAN.md`

Before continuing with Feature 1 Improvements or Feature 2, the engine codebase needs structural cleanup:

- Break up the Konva god class (494 lines, 7 responsibilities â†’ 4 focused modules)
- Remove dead code (pixi adapter, transformer â€” 630 lines)
- Extract shared utilities (color, image loading â€” currently duplicated)
- Add `dispose()` to EditxEngine facade
- Type safety improvements, console.log cleanup

---

## Principles

1. **Engine-first**: For every feature, identify engine gaps and fix them before building UI.
2. **Non-destructive**: All edits are stored as properties on blocks. The original image is never mutated.
3. **Undo/redo**: Every operation goes through the command system so it is undoable.
4. **One feature at a time**: Complete and test each feature before starting the next.
5. **Reference filerobot**: Use the filerobot codebase for core math/logic, but adapt to the engine's block-based model.

---

## Package Layout

```
packages/image-editor/
  src/
    index.ts                    -- Public exports
    image-editor.tsx            -- Main ImageEditor React component
    store/
      image-editor-store.ts     -- Zustand store for image editor UI state
    components/
      toolbar.tsx               -- Image editor toolbar (tool selection)
      canvas.tsx                -- Canvas wrapper
      panels/                   -- Side panels for each tool
    tools/                      -- Tool plugin implementations
    utils/                      -- Image math, crop calculations, etc.
  package.json
  tsconfig.json
```

---

## Session Continuity

When resuming work in a new session:

1. Read this file to see which features are done and which is next
2. Read the feature doc for the next feature
3. Pick up from where we left off
