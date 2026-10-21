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
| 🔤 | **Text** | Rich text presets with curved styles, gradients, highlights, and editable layered compositions, organized in a searchable gallery |
| 🔷 | **Shapes** | Filled, outlined, gradient, image-filled, and abstract shape presets with searchable categories and custom catalog support |
| 🖼️ | **Image Overlays** | Add and position images on the canvas |
| 💾 | **Export** | PNG, JPEG, WebP with quality control |
| ↩️ | **Undo / Redo** | Full command-based history with keyboard shortcuts |
| 🎨 | **Theming** | Built-in dark & light presets, customizable via CSS variables |
| 📐 | **Responsive** | CSS Container Queries — adapts to its container, not the viewport |
| 🌍 | **i18n** | Built-in translations, custom-locale support |

Text and shape galleries support replaceable or extensible categorized catalogs.
Text presets can insert editable layered text-and-shape compositions. See
[Configure Text](docs/guides/configure-fonts.md#layered-text-combinations) and
[Configure Shapes](docs/guides/configure-shapes.md#customize-the-gallery).

## Optional multi-page navigation

Arrange all full-size pages on a continuous canvas, with numbered titles above each page:

```tsx
<ImageEditor
  src="/photo.jpg"
  config={{ ui: { pageNavigation: true, pageLayout: "vertical" } }}
  onReady={({ engine }) => {
    // Populate or load pages using the public engine scene APIs.
    engine.scene.addPage({ width: 600, height: 800 });
  }}
/>
```

`ui.pageNavigation` defaults to `false`, so existing single-image integrations keep
their current UI and rendering behavior. Enabled navigation follows document page order,
shows numbered page titles with each page's name and selection-based page controls.
Hover a page background or title to highlight its frame. Clicking the background or title
selects the page with an outline, without move, resize, or rotation handles.
`ui.pageLayout` accepts `"vertical"` (default) or `"horizontal"`; ordinary wheel scrolling
pans along that canvas axis, while Ctrl/Cmd-wheel zooms. Clicking a canvas page activates
it without moving the camera. Pointer selection never fits or pans the view. Keyboard
focus on a page title selects and fits that page so offscreen pages remain reachable.
There is no bottom thumbnail strip. Try both arrangements in the three-page
`/playground/pages` demo.

Canvas arrangement is transient and independent of persisted `engine.scene.setPageLayout`.
It never rewrites authored page/block positions. `PageNavigationLayout` is exported for
typed host configuration.

Changing pages does not create undo entries or persist other pages as hidden.
`saveScene()` still includes all pages. Navigation is temporarily disabled during crop
or inline text editing; external SDK page changes safely end the old editing state.
Artwork remains independently selectable and editable. Artwork shortcuts do not move,
duplicate, delete, or reorder an outlined page; use its page actions menu instead.
Page navigation does not generate thumbnails; `engine.exportPageThumbnail()` remains
available independently.
Disabling navigation restores the previous engine page-view mode.

Select a page background or title to reveal two bars, following the editor's block UI:
a top properties bar with **Resize** and **Color**, and a floating action bar near the
page's top edge with **Duplicate page** and a **...** menu. The menu offers **Rename page**,
**Move page earlier/later**, and **Delete page**. **Add page** is always visible in a
bottom-center footer, even without a page selection or while artwork is selected.
It appends a blank page using the scene's default dimensions.
The multi-page canvas reserves compact, stable header and footer lanes, so showing the properties
bar does not resize the canvas or move the camera, and Add page never covers page content.
Page fits use 24px padding. Captions stay screen-sized rather than shrinking with zoom;
at very low zoom, a caption moves inside its page when the gap cannot fit its label.
The floating action bar sits at the selected page's top-right edge, clear of its caption.
Selecting artwork hides both page bars, restoring the artwork's normal controls.
Double-click a page title to open **Rename and resize page** directly; artwork
double-click editing is unchanged. Name and dimensions are
saved together as one undoable operation; resizing changes bounds, not artwork.
Background color changes are staged in the color picker until **Apply color** is clicked,
then saved as one undoable operation while preserving existing background transparency.
Add and duplicate activate, select, and fit the new page. Deleting the active page
fits its fallback; deleting the final page reports an error without changing the document.
All document changes use public engine commands and support undo/redo. Page bars are
hidden during cropping and inline text editing; page titles and Add page remain visible
but disabled during editing.

With `ui.pageNavigation`, **Export Image** opens **Export pages**:

- **Current page** (default) exports the active page as a PNG, JPEG, or WebP image.
- **Selected pages** lets users choose pages independently of artwork selection.
- **All pages** includes every document page, regardless of the current canvas view.

Selected and All always produce one ZIP, even when only one page is included.
Entries use document order and safe, unique names such as `01-Cover.png`; each image
keeps its page's own dimensions. An empty selection cannot be exported.
`events.onBeforeSave` and `onSave` run once for the final blob. For ZIP output its MIME
type is `application/zip`, so image-only transforms should check `blob.type`.
Async save callbacks are awaited; failures show an error and leave the dialog open,
without delivering a partial archive.
Partial exports retain unsaved changes and keep the editor open, even with
`closeAfterSave`. Only an unchanged export covering every page marks the document
clean and can auto-close. Editing or replacing the document during rendering aborts
the export; reopening or replacing a document resets page-export selection.

Without `ui.pageNavigation`, the built-in action retains legacy scene export.
`handle.engine.exportPage(pageId)` also remains available for explicit SDK page exports.

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

Go further without forking: add or replace categorized **text and shape preset catalogs** with built-in search, register **custom tools**, inject content into **UI slots** (`topbarRight`, `sidebarBottom`, `contextualBarExtra`), and hook into **editor events** (`onToolChange`, `onBeforeSave`).

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
