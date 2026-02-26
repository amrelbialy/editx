# Creative Editor -- Image Editor Plugin Master Plan

This document tracks the incremental build of a new image editor plugin on top of the creative engine. Each feature is developed as a real-life scenario, and the engine is evolved alongside to support it.

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

---

## Feature Status Tracker

| #   | Feature                        | Status                          | Engine Changes                                           | UI Changes                      | Doc                               |
| --- | ------------------------------ | ------------------------------- | -------------------------------------------------------- | ------------------------------- | --------------------------------- |
| 1   | Load Image onto Canvas         | **done** (improvements pending) | image block rendering, image/src property, async loading | ImageEditor component, src prop | `docs/features/01-load-image.md`  |
| 2   | Crop                           | not started                     | crop properties, clip/mask, tool-mode                    | crop tool UI, presets, overlay  | `docs/features/02-crop.md`        |
| 3   | Rotate and Flip                | not started                     | flip properties, rotation composition                    | rotate slider, flip buttons     | `docs/features/03-rotate-flip.md` |
| 4   | Brightness/Contrast/Saturation | not started                     | adjustment properties, Konva filter pipeline             | adjustment sliders              | `docs/features/04-adjustments.md` |
| 5   | Filters (Presets)              | not started                     | filter model, batch apply                                | filter gallery                  | `docs/features/05-filters.md`     |
| 6   | Resize                         | not started                     | scene.resize API                                         | resize panel                    | `docs/features/06-resize.md`      |
| 7   | Shapes (annotations)           | not started                     | polygon/line/arrow kinds, points property                | shape tools, options            | `docs/features/07-shapes.md`      |
| 8   | Text Annotations               | not started                     | expanded text properties, inline edit                    | text tool, styling panel        | `docs/features/08-text.md`        |
| 9   | Pen / Freehand Drawing         | not started                     | path block kind, points array                            | pen tool, brush options         | `docs/features/09-pen.md`         |
| 10  | Export                         | not started                     | export API, offscreen render                             | save button, format options     | `docs/features/10-export.md`      |

---

## Codebase Refactoring

**Status:** not started | **Doc:** `docs/REFACTORING_PLAN.md`

Before continuing with Feature 1 Improvements or Feature 2, the engine codebase needs structural cleanup:

- Break up the Konva god class (494 lines, 7 responsibilities → 4 focused modules)
- Remove dead code (pixi adapter, transformer — 630 lines)
- Extract shared utilities (color, image loading — currently duplicated)
- Add `dispose()` to CreativeEngine facade
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
