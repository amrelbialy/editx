<div align="center">

# @editx/image-editor

### The open-source, framework-agnostic image editor.

Crop, adjust, filter, annotate &amp; export — in **any** app. Ship it as a **Web Component**, mount it with **vanilla JS**, or use the **React** component. One package, three integrations, on top of the headless [`@editx/engine`](https://github.com/amrelbialy/editx/tree/main/packages/engine).

[![npm version](https://img.shields.io/npm/v/@editx/image-editor.svg)](https://www.npmjs.com/package/@editx/image-editor)
[![npm downloads](https://img.shields.io/npm/dm/@editx/image-editor.svg)](https://www.npmjs.com/package/@editx/image-editor)
[![license](https://img.shields.io/npm/l/@editx/image-editor.svg)](https://github.com/amrelbialy/editx/blob/main/LICENSE)

[**Live Playground**](https://editx-sdk.vercel.app/playground) · [**Documentation**](https://editx-sdk.vercel.app/docs/image-editor/getting-started) · [**GitHub**](https://github.com/amrelbialy/editx)

</div>

---

## Features

| | Feature | Details |
|---|---|---|
| ✂️ | **Crop & Resize** | Freeform, aspect-ratio presets, interactive handles, social-media resize presets |
| 🔄 | **Rotate & Flip** | 90° steps, free-angle straightening, horizontal/vertical flip |
| 🎚️ | **Adjustments** | Brightness, contrast, saturation, temperature, exposure, shadows, highlights, and more |
| ✨ | **Filters** | 40+ built-in presets with adjustable intensity, WebGL-accelerated |
| 🔤 | **Text** | Rich-text annotations via Lexical — fonts, colors, formatting |
| 🔷 | **Shapes** | Rectangles, ellipses, lines, arrows, polygons, stars — filled or outlined |
| 🖼️ | **Image Overlays** | Add and position images on the canvas |
| 💾 | **Export** | PNG, JPEG, WebP with quality control |
| ↩️ | **Undo / Redo** | Full command-based history with keyboard shortcuts |
| 🎨 | **Theming** | Built-in dark & light presets, customizable via CSS variables |
| 📐 | **Responsive** | CSS Container Queries — adapts to its container, not the viewport |
| 🌍 | **i18n** | Built-in translations, custom-locale support |

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

The same package works in **any framework**. It mounts the editor for you, so no framework is required in your own app.

> The editor renders internally with React, which is **bundled into the package** — you never install or import React yourself when using the Web Component or vanilla builds.

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

### Vanilla JS (any framework)

Mount the editor into a plain DOM element — no framework required in your app.

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

### React component

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

#### React modal

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

## Configuration

Everything is driven by a single `config` object — enable only the tools you need, theme it, and localize it:

Everything is driven by a single `config` object — the same shape across every integration (React prop, vanilla option, or Web Component property). Enable only the tools you need, theme it, and localize it:

```ts
const config = {
  tools: ["crop", "adjust", "filter", "text", "shapes", "image"],
  defaultTool: "crop",
  theme: { preset: "light" },
  export: { formats: ["png", "webp"], defaultFormat: "webp" },
};

// React:          <ImageEditor src="/photo.jpg" config={config} />
// Vanilla:        createImageEditor("#editor", { src, config });
// Web Component:  document.querySelector("editx-image-editor").config = config;
```

Go further without forking: register **custom tools**, inject content into **UI slots** (`topbarRight`, `sidebarBottom`, `contextualBarExtra`), and hook into **editor events** (`onToolChange`, `onBeforeSave`).

## Theming

Use built-in presets or provide custom theme colors via the `theme` config (works in any integration):

```ts
import { themePresets } from "@editx/image-editor/presets";

const config = { theme: themePresets.dark };
```

## Exports

The package exports:

- `ImageEditor` / `ImageEditorModal` — Main components
- UI primitives — `Button`, `ColorPicker`, `Select`, `SliderField`, `Section`, etc.
- Config types — `ImageEditorConfig`, `ThemeConfig`, `ExportConfig`, etc.
- Hooks — `useConfig`, `useTranslation`, `useShortcuts`, `useImageEditorStore`
- Theme — `ThemeProvider`, `themePresets`
- Utilities — `validateImageFile`, `downscaleIfNeeded`, `correctOrientation`, etc.

Additional entry points: `@editx/image-editor/vanilla`, `@editx/image-editor/element`, `@editx/image-editor/presets`, `@editx/image-editor/styles.css`.

## Documentation

- [Getting Started](https://editx-sdk.vercel.app/docs/image-editor/getting-started)
- [Configuration](https://editx-sdk.vercel.app/docs/image-editor/configuration)
- [API Reference](https://editx-sdk.vercel.app/docs/image-editor/api)
- [Theming](https://editx-sdk.vercel.app/docs/image-editor/theming)

Part of the [Editx](https://github.com/amrelbialy/editx) monorepo.

## License

[MIT](../../LICENSE)
