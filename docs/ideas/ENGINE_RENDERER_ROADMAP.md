---

## title: Scalability Roadmap & Rendererâ€‘ready Folder Structure

# Scalability Roadmap â€” Editx

This MDX doc explains a pragmatic, staged roadmap to scale your editor from a Konva/Pixi-based prototype to a production-grade, WebGL/Customâ€‘renderer engine (img.ly style) while keeping the engine pure and swapâ€‘friendly.

> **Principle:** keep the **Engine (document + commands)** pure and rendererâ€‘agnostic. Upgrade renderers independently.

## Quick overview (phases)

* **Phase 0 â€” Stable Engine** (now)

  * Clean document schema (scene graph JSON)
  * Commands & Event bus
  * History (command/undo stack)
  * Renderer adapters (Konva, Pixi)
  * React UI driving the engine via commands

* **Phase 1 â€” Performance & UX** (3â€“6 months)

  * Profile hotspots (rendering, text shaping, large images)
  * Add renderer adapter improvements (batch updates, virtualized layers)
  * Tile/viewport rendering for very large canvases
  * Better asset streaming + lazy load
  * Advanced caching (GPU textures / image bitmaps)

* **Phase 2 â€” Effect Pipeline & Text Engine** (6â€“12 months)

  * Implement nonâ€‘destructive adjustment layers (engine model)
  * Design GPU effect pipeline API (passes, shaders)
  * Adopt/implement advanced text shaping (shaping libs, HarfBuzz or use platform text atlas)
  * Add mask & blend group primitives in the engine

* **Phase 3 â€” Custom WebGL Renderer (or WebGPU)** (12â€“24 months)

  * Implement a standalone renderer service that consumes the engine's scene graph
  * Build shader-based filter stack and multi-pass compositor
  * Support highâ€‘quality export (print/PDF/bitmap at arbitrary resolution)
  * Add multiâ€‘renderer testing harness (compare outputs)

* **Phase 4 â€” Server & Offline Rendering** (18â€“36 months)

  * Headless renderer for server side / thumbnails / batch export (WASM or NodeGL/Skia)
  * Deterministic rendering for CI/tests (pixel comparison)
  * Multi-resolution tile server for very large canvases

## Priorities & signals to move phases

1. **When you hit unacceptable editor lag** (20%+ users complain on 1080p with 100 layers) â†’ push Phase 1
2. **When users request nonâ€‘destructive filters & mask layers** â†’ push Phase 2
3. **When export quality vs performance tradeoffs become unacceptable** â†’ start Phase 3
4. **When you need reliable server exports or batch rendering** â†’ Phase 4

## Migration principles (nonâ€‘breaking)

* Keep document JSON backwards compatible (schema versioning)
* Feature flags for rendering features (enable/disable new compositor)
* Adapter pattern: keep old and new renderer sideâ€‘byâ€‘side during rollout
* Automated visual regression tests for render parity
* Expose a render spec and a test harness that both renderers implement

---

# Renderer Evolution Checklist

- [ ] Pure engine API with no renderer types in document
- [ ] Renderer adapter interface defined (render, updateNode, removeNode, flush)
- [ ] Dirty tracking at engine node level (node.markDirty)
- [ ] Batched updates and requestAnimationFrame driven flush
- [ ] Texture / bitmap cache abstraction
- [ ] Multi-pass framebuffer support in renderer
- [ ] Shader library and filter graph model
- [ ] High DPI / export scaling support
- [ ] Headless rendering API

---

# Recommended Renderer Adapter interface (pseudoâ€‘TS)

```ts
export interface RendererAdapter {
  init(options: RendererInitOptions): Promise<void>;
  mount(el: HTMLElement): void;
  createNode(node: EngineNode): RendererNodeHandle;
  updateNode(handle: RendererNodeHandle, node: EngineNode): void;
  removeNode(handle: RendererNodeHandle): void;
  renderFrame(): void; // triggers a frame draw
  dispose(): void;
}
```

Adapters implement this contract for Konva/Pixi/custom WebGL. The engine only calls the adapter.

---

# Folder structure â€” monorepo (rendererâ€‘ready)

This layout is designed to make adding a new renderer a nonâ€‘breaking, incremental step.

```text
/apps
  /dashboard-web        # SaaS dashboard, billing, project management
  /editor-web           # React editor shell (UI + bindings)
/packages
  /engine               # Pure engine: scene graph, commands, history, serializer
  /engine-schema        # JSON schema & types for document versioning
  /editor-ui            # React components (toolbars, panels), uses engine APIs
  /renderer-adapters
    /konva-adapter      # Konva implementation of RendererAdapter
    /pixi-adapter       # Pixi implementation
    /webgl-adapter      # future: custom WebGL renderer
  /ui-kit               # shared React primitives, icons
  /plugins              # plugin system wiring + example plugins
  /assets               # shared assets for dev and testing
  /integration-tests    # visual regression tests & harness
  /exporter             # headless export wrappers (ffmpeg, canvas-kit bindings)
/config
  /scripts
  /cicd
  /deploy
/docs
  /mdx                 # docs and guidelines (use the engine schema docs)

```

## Notes on important packages

- **/packages/engine** â€” must be pure TypeScript, no DOM, no browser globals. Contains scene graph types, command bus, history manager, serializer (save/load), validation and highâ€‘level business rules.

- **/packages/editor-ui** â€” React app that calls engine commands and subscribes to engine events for UI updates. No renderer logic here â€” only controls and binding code.

- **/packages/renderer-adapters** â€” each adapter depends on the engine package. They are thin translators: `EngineNode -> RendererNode` and manage GPU or DOM resources.

- **/packages/exporter** â€” highâ€‘quality export code. When you build a custom renderer, the exporter can reuse shaders/passes to match onâ€‘screen output.

---

# Example: how engineâ†”renderer event flow works

```text
User action -> Editor UI -> Engine.execute(command)
Engine updates node(s) -> marks nodes dirty -> emits events
RendererAdapter listens to engine events -> batches updates -> renderFrame()
```

Key points:

- Engine never holds renderer handles.
- Renderer handles are stored inside the adapter only.
- Engine stores only serializable data.

---

# Helpful patterns & decisions

- **Command pattern for everything** (create, update, delete) for consistent undo/redo
- **Diff-based history** (store patches, not full copies) for performance
- **Node-level dirty flags** and fine-grained invalidation (avoid full redraws)
- **Specification tests** for document â†’ rendering expectations
- **Visual regression tests** between adapters

---

# Appendix â€” quick reference diagram

You can paste your architecture image here for reference:

![current-arch](/mnt/data/35a23b72-ce50-44e6-a958-068be74a5b68.png)

---

# Closing notes

Keep the engine pure. Treat renderer(s) as replaceable implementation details. If you follow this roadmap and folder layout you will be able to scale to a custom WebGL renderer, server-side exports, and advanced nonâ€‘destructive features without rewriting your engine.
