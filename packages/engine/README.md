<div align="center">

# @editx/engine

### Headless, framework-agnostic block engine for building image & creative editors.

Command-pattern undo/redo, Konva 10 renderer, and a lifecycle EventAPI — the core that powers [`@editx/image-editor`](https://www.npmjs.com/package/@editx/image-editor).

**Pure TypeScript, zero UI-framework dependency** — bring it to React, Vue, Svelte, vanilla JS, or no framework at all.

[![npm version](https://img.shields.io/npm/v/@editx/engine.svg)](https://www.npmjs.com/package/@editx/engine)
[![npm downloads](https://img.shields.io/npm/dm/@editx/engine.svg)](https://www.npmjs.com/package/@editx/engine)
[![license](https://img.shields.io/npm/l/@editx/engine.svg)](https://github.com/amrelbialy/editx/blob/main/LICENSE)

[**Documentation**](https://editx-sdk.vercel.app/docs/engine/overview) · [**GitHub**](https://github.com/amrelbialy/editx)

</div>

---

Part of the [Editx](https://github.com/amrelbialy/editx) monorepo.

## Installation

```bash
pnpm add @editx/engine
```


### Peer Dependencies

| Package | Version | Required |
|---------|---------|----------|
| `konva` | `^10.0.0` | Optional — only needed if using the Konva renderer |

## Usage

```ts
import { EditxEngine, IMAGE_SRC } from "@editx/engine";

const engine = new EditxEngine();

// Create a scene — this also creates the first page
await engine.scene.create({ width: 1080, height: 1080 });
const page = engine.scene.getCurrentPage();

// Add an image block to the page
if (page !== null) {
  const image = engine.block.create("image");
  engine.block.setString(image, IMAGE_SRC, "/photo.jpg");
  engine.block.appendChild(page, image);
}
```

### Konva Renderer

To render to a canvas, use the `/konva` subpath. The `createEngine` helper returns an `EditxEngine` with a Konva renderer already attached to your DOM container:

```ts
import { createEngine } from "@editx/engine/konva";

const engine = await createEngine({
  container: document.getElementById("stage")!,
});
```

For advanced setups you can construct the adapter yourself with `KonvaRendererAdapter` and pass it to `new EditxEngine({ renderer })`.

## Key Concepts

- **Blocks** — Everything is a block: pages, images, text, shapes. Each block has typed properties.
- **Command Pattern** — All mutations go through commands, enabling full undo/redo history.
- **EventAPI** — Subscribe to block lifecycle events (`created`, `updated`, `destroyed`).
- **Viewport & transform callbacks** — Typed subscriptions for viewport/interaction: `onZoomChanged`, `onPanChanged`, and the live (pre-commit) `onBlockTransform`. Camera zoom/pan is always clamped (`MIN_ZOOM`–`MAX_ZOOM`).
- **Properties** — Typed property keys (`POSITION_X`, `SIZE_WIDTH`, `FILL_COLOR`, etc.) for reading/writing block state.

### Replacing shape geometry

Use `engine.block.setShapeGeometry(graphicId, geometry)` to replace a graphic's shape without
changing its layout, fill, stroke, effects, group membership, or selection. `ShapeGeometry` is a
public discriminated union for `rect`, `ellipse`, `polygon`, `star`, `line`, and named SVG `path`
descriptors. The replacement is one undo entry; omitted primitive options reset to fresh defaults.
Invalid descriptors throw before history changes, while missing or non-shape targets are no-ops.

```ts
engine.block.setShapeGeometry(graphicId, {
  type: "star",
  points: 8,
  innerDiameter: 0.4,
});
```

### Text background geometry

Block-level text backgrounds support two geometry modes through
`engine.block.setTextBackground(id, options)`:

```ts
engine.block.setTextBackground(textId, {
  enabled: true,
  geometry: "frame",
  padding: { top: 12, right: 16, bottom: 12, left: 16 },
});

const background = engine.block.getTextBackground(textId);
// background.geometry is always resolved to "text-union" or "frame".
```

`TextBackgroundOptions.geometry` accepts `"text-union" | "frame"`. Missing or unknown stored
values resolve to `"text-union"` for compatibility. Text-union padding remains signed and preserves
legacy negative/outward behavior. Frame padding represents content insets and is normalized to
nonnegative values by the block API. Geometry and padding updates share one undoable command batch.
The frozen property key is `TEXT_BACKGROUND_GEOMETRY` (`"text/background/geometry"`).

## Reading vs. mutating block state

Reading and writing block state go through two different, clearly separated paths:

- **Reading** — Use the typed getters (`engine.block.getString`, `getFloat`, `getColor`, …) for
  individual properties, or `engine.block.getSnapshot(id)` for a deep, read-only projection of a
  block's full data.
- **Mutating** — All changes must go through commands: `engine.exec(...)` or the typed setters
  (`engine.block.setString`, `setFloat`, `setColor`, …). Only commands are undoable and emit the
  correct lifecycle events. There is no supported way to mutate the store directly.

```ts
// Read a deep, read-only snapshot of a block's full data.
const snapshot = engine.block.getSnapshot(image); // ReadonlyBlockData | null
if (snapshot !== null) {
  console.log(snapshot.type, snapshot.properties);
  // snapshot is DeepReadonly — every field (including nested arrays/objects) is readonly.
}

// Mutate through a command so the change is undoable and emits events.
engine.block.setFloat(image, POSITION_X, 120);
```

> `getSnapshot` returns a `ReadonlyBlockData` (a `DeepReadonly<BlockData>`). It is a clone, so
> assigning to its fields has no effect on engine state — always route mutations through commands.

## Exports

The package exports:

- `EditxEngine` — Main engine class
- `BlockAPI` — Block manipulation, queries, and read-only snapshots
- `EventAPI` — Block event subscriptions
- Event/viewport types — `BlockTransformEvent`, `BlockTransformPhase`, `ViewportState`, `EditModeChange`
- Property keys — `POSITION_X`, `SIZE_WIDTH`, `FILL_COLOR`, `CROP_*`, `EFFECT_*`, etc.
- Types — `ReadonlyBlockData`, `DeepReadonly<T>` (for read-only snapshots), and the public
  `EditxEngine` type (type against `EditxEngine`, not internal core interfaces).
- Utilities — `loadImage`, `colorToHex`, `hexToColor`, `CROP_PRESETS`, `FILTER_PRESETS`, etc.

## License

[MIT](../../LICENSE)
