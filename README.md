<h1 align="center">EditX</h1>

<p align="center">
  Block-based image editor SDK for React 19.<br/>
  Crop, adjust, filter, add text &amp; shapes — fully themeable and extensible.
</p>

<p align="center">
  <a href="https://github.com/amrelbialy/editx/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License" /></a>
  <a href="https://www.npmjs.com/package/@editx/image-editor"><img src="https://img.shields.io/npm/v/@editx/image-editor.svg" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/react-%3E%3D19-61dafb.svg" alt="React 19+" />
  <img src="https://img.shields.io/badge/typescript-strict-blue.svg" alt="TypeScript strict" />
</p>

---

## Packages

| Package | Description |
|---|---|
| [`@editx/engine`](./packages/engine) | Headless block-based engine — Konva renderer, command pattern, undo/redo, EventAPI |
| [`@editx/image-editor`](./packages/image-editor) | React 19 image editor component — Tailwind CSS 4, Radix UI, Zustand, Lexical |

## Quick Start

```bash
pnpm add @editx/image-editor
```

```tsx
import { ImageEditor } from "@editx/image-editor";
import "@editx/image-editor/styles.css";

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
import { ImageEditorModal } from "@editx/image-editor";

<ImageEditorModal
  open={open}
  onOpenChange={setOpen}
  src="/photo.jpg"
  onSave={(blob) => console.log("Saved:", blob)}
  onClose={() => setOpen(false)}
/>
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

## Tech Stack

- **Runtime**: TypeScript strict, React 19
- **Renderer**: Konva 10 (Canvas 2D) + WebGL for filters
- **Styling**: Tailwind CSS 4, CSS Container Queries
- **UI**: Radix UI primitives, Lucide icons
- **Rich Text**: Lexical
- **State**: Zustand (UI), command pattern (document)
- **Testing**: Vitest, Playwright Component Testing
- **Tooling**: pnpm, Turborepo, Biome

## License

[MIT](./LICENSE)

