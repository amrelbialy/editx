# @editx/engine

Headless block-based creative engine with command-pattern undo/redo, Konva 10 renderer, and EventAPI.

Part of the [EditX](https://github.com/amrelbialy/editx) monorepo.

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
import { EditxEngine } from "@editx/engine";

const engine = new EditxEngine();

// Create a scene
const scene = engine.scene.create();

// Add a page block
const page = engine.block.create("page");
engine.block.appendChild(scene, page);

// Add an image block
const image = engine.block.create("image");
engine.block.setString(image, "image/src", "/photo.jpg");
engine.block.appendChild(page, image);
```

### Konva Renderer

If you need the Konva-based canvas renderer, import from the `/konva` subpath:

```ts
import { KonvaRenderer } from "@editx/engine/konva";
```

## Key Concepts

- **Blocks** — Everything is a block: pages, images, text, shapes. Each block has typed properties.
- **Command Pattern** — All mutations go through commands, enabling full undo/redo history.
- **EventAPI** — Subscribe to block lifecycle events (create, update, delete).
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
