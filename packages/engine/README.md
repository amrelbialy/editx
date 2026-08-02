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
- **Properties** — Typed property keys (`POSITION_X`, `SIZE_WIDTH`, `FILL_COLOR`, etc.) for reading/writing block state.

## Exports

The package exports:

- `EditxEngine` — Main engine class
- `BlockAPI` / `BlockStore` — Block manipulation and storage
- `EventAPI` — Block event subscriptions
- Property keys — `POSITION_X`, `SIZE_WIDTH`, `FILL_COLOR`, `CROP_*`, `EFFECT_*`, etc.
- Utilities — `loadImage`, `colorToHex`, `hexToColor`, `CROP_PRESETS`, `FILTER_PRESETS`, etc.

## License

[MIT](../../LICENSE)
