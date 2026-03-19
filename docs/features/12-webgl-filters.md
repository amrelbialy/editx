# Feature 12 — WebGL Filter Pipeline

## Summary

Replace the CPU-based Konva filter pipeline (`imgNode.cache()` + JS pixel loops) with a hidden WebGL canvas that runs all 12 adjustments + 43 filter presets as GPU fragment shaders in a single draw call. Konva continues handling interactive editing (drag, transform, selection, text). The WebGL canvas produces the filtered image, fed directly to `Konva.Image.image()`.

## Problem

Each `syncBlock()` call triggers `#applyFilters()` → `buildFilterPipeline()` → N separate JS pixel loops → `imgNode.cache()`. With 6+ active adjustments on a 2MP image this takes 200–500ms on CPU, blocking the main thread. Slider drag and filter switching become unusable.

## Solution

A standalone `WebGLFilterRenderer` class creates a hidden `<canvas>` with a WebGL2 context. All 12 adjustments + preset color grading run as a single GLSL fragment shader on the GPU (~0.5–2ms). The filtered canvas is passed to `Konva.Image.image()` — Konva never calls `cache()` or runs any pixel filters.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Konva Stage (visible)                                │
│  ┌──────────────┐  ┌──────┐  ┌──────┐               │
│  │ Page/Image    │  │ Text │  │ Rect │  ← drag,      │
│  │ (.image() =   │  │      │  │      │    transform,  │
│  │  GL output)   │  └──────┘  └──────┘    select      │
│  └──────┬───────┘                                     │
└─────────┼────────────────────────────────────────────┘
          │  imgNode.image(filteredCanvas)
┌─────────┴────────────────────────────────────────────┐
│  WebGLFilterRenderer (hidden, offscreen)              │
│  1. Source image → GPU texture (uploaded once)         │
│  2. Single fragment shader applies all adjustments     │
│  3. Returns the <canvas> element                      │
└──────────────────────────────────────────────────────┘
```

## Data Flow (slider change)

```
handleAdjustChange(brightness, 0.3)
  → React state update (slider UI)
  → engine.block.setFloat(effectId, key, 0.3)
  → engine.exec → flush → syncBlock
    → #applyFilters(imgNode, block)
      → collect 12 adjustment values + preset name
      → webglRenderer.render({ brightness: 0.3, ... })   // ~1ms GPU
      → imgNode.image(filteredCanvas)                     // no cache()
      → stage.batchDraw()
```

## Implementation Steps

### Phase 1 — WebGL Filter Renderer

**Step 1: `packages/engine/src/konva/webgl-filter-renderer.ts`**

Standalone class, no Konva dependency, no npm dependencies (raw WebGL2):

```typescript
class WebGLFilterRenderer {
  constructor(); // hidden <canvas>, WebGL2 context, compile shader
  uploadImage(source: TexImageSource, w: number, h: number); // upload as GPU texture
  render(params: FilterParams): HTMLCanvasElement; // set uniforms, draw, return canvas
  dispose(); // delete textures, context
}

interface FilterParams {
  brightness: number; // -1..1, default 0
  contrast: number; // -1..1
  saturation: number; // -1..1
  gamma: number; // -1..1
  exposure: number; // -1..1
  temperature: number; // -1..1
  shadows: number; // -1..1
  highlights: number; // -1..1
  blacks: number; // -1..1
  whites: number; // -1..1
  clarity: number; // -1..1
  sharpness: number; // 0..100
  preset: string; // preset name or '' for none
}
```

**Step 2: GLSL fragment shader**

Single uber-shader applying all 12 adjustments in one pass:

| Adjustment  | GLSL technique                                                       |
| ----------- | -------------------------------------------------------------------- |
| brightness  | `color.rgb += u_brightness`                                          |
| contrast    | `color.rgb = (color.rgb - 0.5) * (1.0 + u_contrast) + 0.5`           |
| saturation  | `mix(vec3(luminance), color.rgb, 1.0 + u_saturation)`                |
| gamma       | `pow(color.rgb, vec3(1.0 / (1.0 + u_gamma)))`                        |
| exposure    | `color.rgb *= pow(2.0, u_exposure)`                                  |
| temperature | `color.r += u_temperature * 0.157; color.b -= u_temperature * 0.157` |
| highlights  | Luminance-weighted: `weight = max(0, (lum - 0.5) * 2.0)`             |
| shadows     | Luminance-weighted: `weight = max(0, (0.5 - lum) * 2.0)`             |
| blacks      | Tone-weighted: `weight = max(0, 1.0 - v / 0.5)`                      |
| whites      | Tone-weighted: `weight = max(0, (v - 0.5) / 0.498)`                  |
| sharpness   | 3×3 unsharp mask via `texelFetch()` (4 neighbor samples)             |
| clarity     | 5×5 box blur unsharp mask via `texelFetch()` (25 samples)            |

Presets are applied as uniform data (not code branches):

```glsl
// Preset uniforms — set from JS lookup table
uniform float u_presetBrightness;
uniform float u_presetContrast;
uniform float u_presetSaturation;
uniform float u_presetSepia;
uniform float u_presetGrayscale;
uniform vec3  u_presetRGB;
uniform vec4  u_presetColorFilter;
```

**Step 3: `packages/engine/src/konva/webgl-preset-data.ts`**

Convert 43 preset functions to uniform-value data objects:

```typescript
export interface PresetUniforms {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  grayscale: number;
  rgb: [number, number, number];
  colorFilter: [number, number, number, number];
}

// Example:
// clarendon: { brightness: 0.1, contrast: 0.1, saturation: 0.15, ... }
```

### Phase 2 — Integration

**Step 4: Instantiate in `KonvaRendererAdapter`**

- Create one `WebGLFilterRenderer` in constructor
- Pass to `KonvaNodeFactory`
- Dispose in `dispose()`

**Step 5: Replace `#applyFilters()` in `konva-node-factory.ts`**

Before: `buildFilterPipeline()` → `imgNode.filters([...])` → `imgNode.cache()`
After: `webglRenderer.render(params)` → `imgNode.image(filteredCanvas)` — no Konva filters, no cache

**Step 6: Update image loading callbacks**

After `loadImage(src)` resolves:

1. Store original: `imgNode.setAttr('_sourceImage', htmlImg)`
2. Upload: `webglRenderer.uploadImage(htmlImg, w, h)`
3. Filter: `imgNode.image(webglRenderer.render(params))`

### Phase 3 — Export & Fallback

**Step 7: Export** — works automatically (`stage.toDataURL()` renders from `imgNode.image()`)

**Step 8: CPU fallback** — if `getContext('webgl2')` fails, fall back to existing `buildFilterPipeline()` + Konva `cache()` path

## Files

| File                                                         | Action                                                                  |
| ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `packages/engine/src/konva/webgl-filter-renderer.ts`         | **NEW**                                                                 |
| `packages/engine/src/konva/webgl-preset-data.ts`             | **NEW**                                                                 |
| `packages/engine/src/konva/konva-node-factory.ts`            | **MODIFY** `#applyFilters()`, `#updateImageNode()`, `#updatePageNode()` |
| `packages/engine/src/konva/konva-renderer-adapter.ts`        | **MODIFY** instantiate + dispose                                        |
| `packages/engine/src/konva/filters/build-filter-pipeline.ts` | **KEEP** as CPU fallback                                                |
| `packages/engine/src/konva/filters/*.ts`                     | **KEEP** as CPU fallback                                                |
| `packages/engine/src/konva/filters/presets/index.ts`         | **KEEP**                                                                |
| `packages/engine/src/render-adapter.ts`                      | **NO CHANGE**                                                           |

## Verification

1. Each adjustment: WebGL output matches CPU output within delta ≤ 2 per channel
2. All 43 presets: WebGL matches CPU within tolerance
3. Export with adjustments + preset: output blob correct
4. Crop + flip + rotation with active filters: visual correctness
5. WebGL context failure: CPU fallback activates
6. Performance: measure `cache()` vs `render()` on 2MP image, 6 adjustments + 1 preset
7. Manual: rapid slider drag, preset switching, undo/redo — no glitches

## Decisions

- No new npm dependencies — raw WebGL2 API
- Single uber-shader compiled once at startup
- Presets as uniform data, not shader code branches
- Sharpness/clarity use `texelFetch()` neighbor sampling in GLSL
- CPU fallback kept for WebGL-unsupported environments
- One GL context shared across all image nodes, one texture per unique image src
