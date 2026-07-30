# @editx/image-editor

[![npm version](https://img.shields.io/npm/v/@editx/image-editor.svg)](https://www.npmjs.com/package/@editx/image-editor)
[![npm downloads](https://img.shields.io/npm/dm/@editx/image-editor.svg)](https://www.npmjs.com/package/@editx/image-editor)
[![license](https://img.shields.io/npm/l/@editx/image-editor.svg)](https://github.com/amrelbialy/editx/blob/main/LICENSE)

The open-source, extensible image editor — crop, adjust, filter, annotate & export.
A React 19 component on top of the headless, framework-agnostic [`@editx/engine`](https://github.com/amrelbialy/editx/tree/main/packages/engine).

Part of the [Editx](https://github.com/amrelbialy/editx) monorepo.

## Installation

```bash
pnpm add @editx/image-editor
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | `^19.2.0` |
| `react-dom` | `^19.2.0` |

## CSS Setup

Editx uses **Tailwind CSS 4** and CSS Container Queries for responsive layout. In your project's main CSS file:

```css
@import "tailwindcss";
@import "@editx/image-editor/styles.css";

@source "../node_modules/@editx/image-editor/dist";
```

> **Important:** The `@source` path must point to `dist` — only `dist` is included in the published package. Without this directive, Tailwind won't detect the editor's container query classes and the responsive layout will break (mobile styles on desktop).

## Usage

```tsx
import { ImageEditor } from "@editx/image-editor";

function App() {
  return (
    <ImageEditor
      src="/photo.jpg"
      onSave={(blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "edited.png";
        a.click();
      }}
    />
  );
}
```

### Modal Usage

```tsx
import { useState } from "react";
import { ImageEditorModal } from "@editx/image-editor";

function App() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)}>Edit Image</button>
      <ImageEditorModal
        open={open}
        onOpenChange={setOpen}
        src="/photo.jpg"
        onSave={(blob) => console.log("Saved:", blob)}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
```

### Without React (any framework)

Mount the editor into a plain DOM element — no React required in your app.

```ts
import { createImageEditor } from "@editx/image-editor/vanilla";
import "@editx/image-editor/styles.css";

const editor = createImageEditor("#editor", {
  src: "/photo.jpg",
  onSave: (blob) => upload(blob),
});

editor.update({ config: { tools: ["crop"] } }); // patch options later
editor.destroy(); // tear down when done
```

### As an HTML Web Component

Register `<editx-image-editor>` once and use it declaratively in any HTML.

```ts
import { defineImageEditorElement } from "@editx/image-editor/element";
import "@editx/image-editor/styles.css";

defineImageEditorElement(); // registers <editx-image-editor>
```

```html
<editx-image-editor src="/photo.jpg" width="900px" height="600px"></editx-image-editor>
```

```js
const el = document.querySelector("editx-image-editor");
el.config = { tools: ["crop", "adjust"] }; // complex inputs are properties
el.addEventListener("save", (e) => upload(e.detail.blob));
```

## Features

- **Crop** — freeform, aspect ratio presets, interactive handles
- **Rotate & Flip** — 90° steps, free rotation, horizontal/vertical flip
- **Adjustments** — brightness, contrast, saturation, exposure, shadows, highlights, and more
- **Filters** — 30+ built-in presets with WebGL acceleration
- **Text** — rich text annotations with Lexical editor, fonts, formatting
- **Shapes** — rectangles, ellipses, polygons, stars, arrows
- **Image Overlays** — add and position images on the canvas
- **Resize** — output resolution control
- **Export** — PNG, JPEG, WebP with quality settings
- **Undo/Redo** — full history via command pattern
- **Theming** — built-in presets (dark, light) + fully customizable via CSS variables
- **Responsive** — CSS Container Queries, adapts to any container size
- **i18n** — built-in translations, custom locale support

## Theming

Use built-in presets or provide custom theme colors:

```tsx
import { themePresets } from "@editx/image-editor/presets";

<ImageEditor
  src="/photo.jpg"
  config={{ theme: themePresets.dark }}
/>
```

## Exports

The package exports:

- `ImageEditor` / `ImageEditorModal` — Main components
- UI primitives — `Button`, `ColorPicker`, `Select`, `SliderField`, `Section`, etc.
- Config types — `ImageEditorConfig`, `ThemeConfig`, `ExportConfig`, etc.
- Hooks — `useConfig`, `useTranslation`, `useShortcuts`, `useImageEditorStore`
- Theme — `ThemeProvider`, `themePresets`
- Utilities — `validateImageFile`, `downscaleIfNeeded`, `correctOrientation`, etc.

## License

[MIT](../../LICENSE)
