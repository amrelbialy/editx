# Feature 6: Shapes (Annotations)

**Status:** in progress

## User Story

As a user, I click the Shapes tool in the toolbar. A side panel appears with a grid of shape presets (Rectangle, Ellipse, Triangle, Pentagon, Hexagon, Star, Arrow). I select a shape and a fill mode (Filled or Outline), then click on the canvas to place it. The shape appears at the click position with default size and is auto-selected. I can then move, resize, rotate, edit fill colour, stroke, opacity, and shape-specific properties (corner radius, polygon sides, star points). Each change is an undo step.

## Scenarios

### Place a shape

1. User clicks "Shapes" in toolbar
2. Side panel shows 7 shape thumbnails in a grid, with Filled/Outline toggle
3. "Rectangle" is selected by default, "Filled" mode active
4. User clicks on the canvas → a filled blue rectangle (100×100) appears at click position
5. The shape is auto-selected with transform handles visible

### Switch shape preset

1. User clicks "Star" in the shapes panel
2. User clicks on the canvas → a filled blue 5-pointed star appears
3. Star is auto-selected

### Outline mode

1. User toggles "Outline" in the shapes panel
2. User clicks canvas → shape appears with transparent fill, black stroke (2px)
3. Shape is auto-selected

### Edit shape properties

1. User selects a placed rectangle
2. User changes fill colour to red → rectangle updates in real time
3. User increases corner radius to 20 → corners round
4. Each property change is a separate undo step

### Edit polygon sides

1. User places a pentagon (polygon, 5 sides)
2. In property controls, user changes sides to 3 → shape becomes a triangle
3. Changes sides to 8 → shape becomes an octagon

### Edit star properties

1. User places a star
2. User changes points from 5 to 8 → star has 8 points
3. User adjusts inner diameter → star points become thinner/fatter

### Delete shape

1. User selects a shape on canvas
2. User presses Delete → shape and its sub-blocks are destroyed
3. Undo restores the shape

### Undo/redo

1. User places a rectangle
2. Ctrl+Z → rectangle is removed
3. Ctrl+Y → rectangle is restored

### Compose with image

1. User loads an image (Feature 1)
2. User crops the image (Feature 2)
3. User switches to Shapes tool and places a star annotation
4. All three render correctly together — image cropped, star on top

## Architecture

### img.ly Sub-Block Model

Shapes use a **separated sub-block architecture** matching img.ly CE.SDK. A graphic block is a container that holds shape and fill sub-blocks:

```
graphic block (type='graphic')
  ├── shape sub-block (type='shape', kind='rect')     → geometry
  ├── fill sub-block  (type='fill', kind='color')      → visual content
  ├── stroke          (properties on graphic block)     → outline
  └── effects[]       (existing effect sub-blocks)      → filters
```

This follows the same pattern as the existing effect sub-block system (`effectIds[]`), extended with `shapeId` and `fillId` singular references on BlockData.

### Shape Types (engine-level)

| ShapeType | Konva Class            | Shape-specific properties       |
| --------- | ---------------------- | ------------------------------- |
| `rect`    | `Konva.Rect`           | `cornerRadius`                  |
| `ellipse` | `Konva.Ellipse`        | —                               |
| `polygon` | `Konva.RegularPolygon` | `sides`                         |
| `star`    | `Konva.Star`           | `points`, `innerDiameter`       |
| `line`    | `Konva.Arrow`          | `pointerLength`, `pointerWidth` |

### Fill Types

| FillType | Description            |
| -------- | ---------------------- |
| `color`  | Solid colour (default) |

Future: `gradient/linear`, `image`

### 7 Presets

| Preset    | ShapeType | Config                            |
| --------- | --------- | --------------------------------- |
| Rectangle | `rect`    | default                           |
| Ellipse   | `ellipse` | default                           |
| Triangle  | `polygon` | sides=3                           |
| Pentagon  | `polygon` | sides=5                           |
| Hexagon   | `polygon` | sides=6                           |
| Star      | `star`    | points=5, innerDiameter=0.5       |
| Arrow     | `line`    | pointerLength=10, pointerWidth=10 |

### New Property Keys

Shape properties (on shape sub-block):

- `shape/rect/cornerRadius`
- `shape/polygon/sides`
- `shape/star/points`
- `shape/star/innerDiameter`
- `shape/line/pointerLength`
- `shape/line/pointerWidth`

Fill properties (on fill sub-block):

- `fill/color/value`

Toggle properties (on graphic block):

- `fill/enabled`
- `stroke/enabled`

## Implementation

### Engine changes

1. **block.types.ts** — Add `'shape'`/`'fill'` to `BlockType`, new `ShapeType`/`FillType` unions, `shapeId`/`fillId` on `BlockData`
2. **property-keys.ts** — 8 shape + 1 fill + 2 toggle property constants
3. **block-defaults.ts** — Shape/fill defaults per kind, graphic block `fill/enabled`+`stroke/enabled`
4. **block-store.ts** — `createShape()`/`createFill()`, `setShape()`/`getShape()`, `setFill()`/`getFill()`, destroy cascade
5. **block-api.ts** — Shape/Fill/Stroke convenience APIs, `addShape()` helper
6. **Commands** — `CreateShapeCommand`, `CreateFillCommand`, `SetShapeCommand`, `SetFillCommand`
7. **konva-node-factory.ts** — Resolve shape sub-block → create Konva.Rect/Ellipse/RegularPolygon/Star/Arrow, apply fill/stroke from sub-blocks
8. **konva-renderer-adapter.ts** — Skip `type='shape'`/`'fill'` in syncBlock()

### UI changes

9. **image-editor-store.ts** — `activeShapeKind`, `shapeFillMode`
10. **shapes-panel.tsx** (new) — Shape grid + fill mode toggle + property controls
11. **image-editor.tsx** — Tool wiring, click-to-place, auto-select, delete

## Future Expansion (no refactoring needed)

1. Add `'vector_path'` to ShapeType → `Konva.Path` → 30+ preset SVG shapes
2. Add `'gradient/linear'` to FillType → gradient fill category
3. Add `'image'` to FillType → image fill category
4. Add category panel UI (Filled/Outline/Gradient/Image tabs)
5. Add per-corner radius for rect
6. Add drag-to-draw placement mode
7. Add shadow properties
8. Add shape duplication shortcut
