<div align="center">

# Editx

### The open-source, framework-agnostic image editor — powered by a headless block engine.

Crop, adjust, filter, annotate &amp; export — in **any** app. Ship it as a **Web Component**, mount it with **vanilla JS**, or drop in the **React** component. All three run on the same headless, framework-agnostic core — with **no framework lock-in** and no editor framework of your own required.

<p>
  <a href="https://github.com/amrelbialy/editx/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/@editx/image-editor"><img src="https://img.shields.io/npm/v/@editx/image-editor.svg" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@editx/image-editor"><img src="https://img.shields.io/npm/dm/@editx/image-editor.svg" alt="npm downloads" /></a>
  <img src="https://img.shields.io/badge/react-%3E%3D19-61dafb.svg" alt="React 19+" />
  <img src="https://img.shields.io/badge/typescript-strict-blue.svg" alt="TypeScript strict" />
</p>

<p>
  <a href="https://editx-sdk.vercel.app/playground"><b>Live Playground</b></a> ·
  <a href="https://editx-sdk.vercel.app/docs/image-editor/getting-started"><b>Documentation</b></a> ·
  <a href="https://www.npmjs.com/package/@editx/image-editor"><b>npm</b></a>
</p>

</div>

---

```bash
pnpm add @editx/image-editor
```

## Why Editx

- 🌐 **Framework-agnostic** — use it as a Web Component, with vanilla JS, or via the React component. Same editor, any stack — and no editor framework of your own required.
- 🧩 **A real engine underneath** — the UI is a thin layer over [`@editx/engine`](./packages/engine), a **headless, framework-agnostic block engine** (pure TypeScript, zero React) with a command-based undo/redo system. Build your own UI on top, or extend ours.
- 🆓 **Open source & MIT-licensed** — no per-seat fees, no vendor lock-in. Fork it, ship it, own it.
- 🛠️ **Extensible by design** — configure tools, theme, colors, and i18n; register custom tools, render slots, and event hooks without forking.
- ↩️ **Non-destructive** — every edit is a block property change routed through the command system, so everything is undoable, replayable, and serializable.
- ⚡ **Modern stack** — Konva 10, Tailwind CSS 4, CSS Container Queries, WebGL-accelerated filters.

## Features

| | Feature | Details |
|---|---|---|
| ✂️ | **Crop & Resize** | Freeform, aspect-ratio presets, interactive handles, and social-media resize presets (Instagram, Facebook, TikTok, YouTube) |
| 🔄 | **Rotate & Flip** | 90° steps, free-angle straightening, horizontal/vertical flip |
| 🎚️ | **Adjustments** | Brightness, contrast, saturation, temperature, exposure, shadows, highlights, sharpness, clarity, and more (12 controls) |
| ✨ | **Filters** | 40+ built-in presets with adjustable intensity, WebGL-accelerated |
| 🔤 | **Text** | Rich text presets with curved styles, gradients, highlights, and editable layered compositions, organized in a searchable gallery |
| 🔷 | **Shapes** | Filled, outlined, gradient, image-filled, and abstract shape presets with searchable categories and custom catalog support |
| 🖼️ | **Image Overlays** | Add and position images on top of the canvas |
| 💾 | **Export** | PNG, JPEG, or WebP with quality control |
| ↩️ | **Undo / Redo** | Full command-based history with keyboard shortcuts |
| 🎨 | **Theming** | Built-in dark & light presets, fully customizable via CSS variables |
| 📐 | **Responsive** | CSS Container Queries — adapts to its container, not the viewport |
| 🌍 | **i18n** | Built-in translations with custom-locale support |

## Packages

| Package | Description | Version |
|---|---|---|
| [`@editx/engine`](./packages/engine) | **Framework-agnostic** headless block engine (pure TypeScript, no React) — Konva renderer, command pattern, undo/redo, EventAPI | [![npm](https://img.shields.io/npm/v/@editx/engine.svg)](https://www.npmjs.com/package/@editx/engine) |
| [`@editx/image-editor`](./packages/image-editor) | Ready-made editor UI on top of the engine — ships as a Web Component, vanilla-JS mount, and React component | [![npm](https://img.shields.io/npm/v/@editx/image-editor.svg)](https://www.npmjs.com/package/@editx/image-editor) |

## Quick Start

### 1. Install

```bash
pnpm add @editx/image-editor
```

### 2. Set up CSS

Editx uses **Tailwind CSS 4** (this applies to every integration below). In your project's main CSS file, import the editor styles and add a `@source` directive so Tailwind generates the required utility classes:

```css
@import "tailwindcss";
@import "@editx/image-editor/styles.css";

@source "../node_modules/@editx/image-editor/dist";
```

> **Important:** The `@source` path must point to `dist` — only `dist` is included in the published package. Without this directive, Tailwind won't detect the editor's container-query classes and the responsive layout will break.

### 3. Mount it — in any framework

Pick the integration that fits your stack. All three come from the same package and expose the same options.

<table>
<tr><th>Web Component</th><th>Vanilla JS</th><th>React</th></tr>
<tr valign="top">
<td>

```ts
import { defineImageEditorElement }
  from "@editx/image-editor/element";

defineImageEditorElement();
```
```html
<editx-image-editor
  src="/photo.jpg"
></editx-image-editor>
```

</td>
<td>

```ts
import { createImageEditor }
  from "@editx/image-editor/vanilla";

const editor = createImageEditor(
  "#editor",
  { src: "/photo.jpg", onSave: upload },
);
// editor.update({ ... }) / editor.destroy()
```

</td>
<td>

```tsx
import { ImageEditor }
  from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  onSave={upload}
/>
```

</td>
</tr>
</table>

> The `vanilla` and Web Component builds mount the editor for you and need **no framework in your own app**. (Internally the editor renders with React, which is bundled in — you never install or import it yourself.) A dialog variant, `ImageEditorModal`, is also available for React.

## Configure & extend

Everything is driven by a single `config` object — the same shape whether you pass it as a React prop, a vanilla option, or a Web Component property. Enable only the tools you need, theme it, and localize it:

```ts
const config = {
  tools: ["crop", "adjust", "filter", "text"],
  theme: { preset: "light" },
  export: { formats: ["png", "webp"], defaultFormat: "webp" },
};

// React:          <ImageEditor src="/photo.jpg" config={config} />
// Vanilla:        createImageEditor("#editor", { src, config });
// Web Component:  document.querySelector("editx-image-editor").config = config;
```

Go further without forking: add or replace categorized **text and shape preset catalogs** with built-in search, register **custom tools**, inject content into **UI slots** (`topbarRight`, `sidebarBottom`, `contextualBarExtra`), and hook into **editor events** (`onToolChange`, `onBeforeSave`).

## Documentation

- 📖 [Getting Started](https://editx-sdk.vercel.app/docs/image-editor/getting-started)
- ⚙️ [Configuration](https://editx-sdk.vercel.app/docs/image-editor/configuration)
- 🧬 [API Reference](https://editx-sdk.vercel.app/docs/image-editor/api)
- 🎨 [Theming](https://editx-sdk.vercel.app/docs/image-editor/theming)
- 🕹️ [Interactive Playground](https://editx-sdk.vercel.app/playground)

## Tech Stack

- **Core engine**: TypeScript strict — framework-agnostic, no UI framework
- **Renderer**: Konva 10 (Canvas 2D) + WebGL for filters
- **Editor UI**: React 19 (bundled) — consumable as a Web Component or via vanilla JS with no React of your own
- **Styling**: Tailwind CSS 4, CSS Container Queries
- **UI primitives**: Radix UI, Lucide icons
- **Rich Text**: Lexical
- **State**: Zustand (UI), command pattern (document)
- **Testing**: Vitest, Playwright Component Testing
- **Tooling**: pnpm, Turborepo, Biome

## Development

```bash
# Install dependencies
pnpm install

# Run all packages in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint & format
pnpm check
```

### Project Structure

```
packages/engine          → @editx/engine (headless, no React)
packages/image-editor    → @editx/image-editor (React 19 component)
apps/demo                → Demo site & documentation
```

## Contributing

Contributions are welcome — bug reports, docs, features, and fixes. See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, coding conventions, testing, and the pull-request flow.

## License

[MIT](./LICENSE) © [amrelbialy](https://github.com/amrelbialy)
