# Creative Editor SDK Roadmap

A phased roadmap for building a web-based Creative Editor SDK (image/video/text/template editor), designed for **solo developers** using **React, TypeScript, PixiJS, Zustand, Tailwind, and Shadcn/UI**.

---

## Phase 0 — Project Setup (High Priority)

**Goal:** Establish monorepo, packages, and basic build system.

- ✅ Initialize **pnpm** + **Turborepo** monorepo
- ✅ Create **packages**:
  - `engine` (core document + command system)
  - `renderer` (PixiJS renderer)
  - `react-editor` (React wrapper + UI)
  - `types` (shared TypeScript types)
  - `utils` (helper functions)
- ✅ Create **apps/demo** using Vite (React + TypeScript)
- ✅ Setup **TailwindCSS** + Shadcn/UI
- ✅ Configure **TypeScript** in all packages
- ✅ Setup **Zustand store** for UI state

---

## Phase 1 — Core Engine (High Priority)

**Goal:** Implement the backbone of your editor.

- Create `CreativeDocument` model
  - Metadata, canvas settings, global styles, layers
- Implement **Layer Management**
  - Add/remove/reorder, lock/hide/group/ungroup
- Implement **Command System**
  - Undo / Redo, history stack
- Implement **Event System**
  - Document, layer, and tool events
- Setup **Plugin System** for future tools, layers, filters

---

## Phase 2 — Renderer (High Priority)

**Goal:** Render layers efficiently using PixiJS.

- Implement **Layer Rendering**
  - Text, Image, Shape, Video (preview)
- Implement **Transformations**
  - Position, scale, rotation, opacity
- Implement **Filters / Effects**
  - Brightness, contrast, saturation, blur, masking
- Implement **Optimizations**
  - Layer caching, only render visible layers, GPU acceleration

---

## Phase 3 — React Editor UI (High Priority)

**Goal:** Build user-facing editor interface.

- Canvas component
- Toolbar (tool selection, undo/redo, zoom)
- Layers Panel (reorder, lock, hide, group)
- Properties Panel (transform, text style, image/shape properties)
- Timeline Panel (layer tracks, trim, playback)
- Connect **Zustand store** to all UI components

---

## Phase 4 — Tools & Interactions (Medium Priority)

**Goal:** Implement essential editor tools.

- Selection tool
- Move / Transform tool
- Text tool (create, edit, style)
- Image tool (upload, crop, resize, replace)
- Shape tool
- Brush / Draw tool
- Crop tool
- Tool events & lifecycle

---

## Phase 5 — Export / Processing (Medium Priority)

**Goal:** Implement image & video export pipeline.

- Image export (PNG, JPEG, WEBP)
- Video export:
  - Browser (ffmpeg.wasm — limited)
  - Backend / SaaS (high-res)
  - Frame rendering from PixiJS
  - Audio support
- Unified Export API (browser / self-hosted / SaaS)
- Optional watermark for free plan

---

## Phase 6 — Templates & Assets (Medium Priority)

- Save/load `CreativeDocument` JSON
- Placeholder system for text/images
- Preset canvas sizes (social media, posters)
- Guides / snapping / rulers
- Global styles / themes
- Groups / masks / reusable components

---

## Phase 7 — Video / Timeline (Medium Priority)

- VideoLayer: load/play preview, transform, opacity
- Timeline tracks: start/end time, trim handles, reordering
- Scrubbing / playback
- Audio layer support
- Frame-by-frame rendering for export

---

## Phase 8 — Filters / Effects (Low Priority)

- Image filters: brightness, contrast, saturation, blur, custom shaders
- Text effects: shadow, outline, gradient, animations
- Video effects: color, overlay, transitions
- Layer masks / clipping

---

## Phase 9 — Plugins / SDK Extensibility (Low Priority)

- Custom tools
- Custom layer types
- Custom filters / effects
- Exporter plugins
- Event hooks

---

## Phase 10 — SaaS / Account Integration (Optional)

- Free plan: limited resolution, duration, watermark
- Self-hosted API option
- Paid subscription / premium backend export

---

## Development Notes

- **Engine:** pure TypeScript, headless, handles document/layers/commands
- **UI State:** Zustand store for React components (selected layer, active tool, zoom, sidebar)
- **Renderer:** PixiJS for GPU-accelerated canvas rendering
- **Export:** Browser (ffmpeg.wasm) → Backend / SaaS (ffmpeg + optional headless Pixi)
- **Incremental approach:** Build Phase 0 → Phase 1 → Phase 2 first; tools, export, video can be added gradually
