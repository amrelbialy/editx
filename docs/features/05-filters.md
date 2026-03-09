# Feature 5: Filters (Presets)

**Status:** in progress

## User Story

As a user, I click the Filters tool in the toolbar. A side panel appears with a gallery of named filter presets (e.g. "Clarendon", "Moon", "Valencia"). I click a preset and the image updates in real time. Clicking "Original" removes the filter. Only one filter is active at a time — selecting a new one replaces the previous. Filters compose correctly with crop, rotation, flip, and adjustments. Each filter change is an undo step.

## Scenarios

### Apply a filter

1. User clicks "Filters" in toolbar
2. Side panel shows a gallery of filter presets with "Original" highlighted
3. User clicks "Clarendon" → image updates with warm tones + boosted contrast
4. "Clarendon" is now highlighted in the gallery

### Change filter

1. User has "Clarendon" applied
2. User clicks "Moon" → image changes to grayscale + slight brightness boost
3. "Moon" is now highlighted, "Clarendon" is not

### Remove filter (Original)

1. User has a filter applied
2. User clicks "Original" → filter is removed, image returns to unfiltered state
3. "Original" is now highlighted

### Undo/redo

1. User applies "Valencia"
2. Ctrl+Z → filter is removed (back to Original)
3. Ctrl+Y → "Valencia" is re-applied

### Compose with adjustments

1. User increases Brightness to 0.3 in Adjust tool
2. User switches to Filters and applies "Clarendon"
3. Both effects render correctly — adjustments apply first, then filter on top
4. Undo removes filter but keeps brightness adjustment

### Compose with crop and rotate

1. User crops the image (Feature 2)
2. User rotates the image (Feature 3)
3. User applies a filter
4. All three effects render correctly together

## img.ly CE.SDK Reference

In img.ly's CE.SDK, colour grading filters are modeled as **`lut_filter` effect blocks** using LUT (Look-Up Table) PNG files:

```ts
// img.ly approach: LUT-based filter
const effect = engine.block.createEffect("lut_filter");
engine.block.setString(
  effect,
  "effect/lut_filter/lutFileURI",
  "https://.../vintage.png",
);
engine.block.setInt(effect, "effect/lut_filter/horizontalTileCount", 5);
engine.block.setInt(effect, "effect/lut_filter/verticalTileCount", 5);
engine.block.setFloat(effect, "effect/lut_filter/intensity", 0.85);
engine.block.appendEffect(imageBlock, effect);
```

**img.ly effect types:** `adjustments`, `extrude_blur`, `pixelize`, `vignette`, `half_tone`, `lut_filter`, `duotone_filter`

**img.ly LUT filter properties:**
| Property | Type | Purpose |
| --- | --- | --- |
| `effect/lut_filter/lutFileURI` | string | Path to LUT PNG file |
| `effect/lut_filter/horizontalTileCount` | int | Grid columns in LUT |
| `effect/lut_filter/verticalTileCount` | int | Grid rows in LUT |
| `effect/lut_filter/intensity` | float (0–1) | Blend strength |

**Reference:** https://img.ly/docs/cesdk/js/filters-and-effects/apply-2764e4/

## Architecture Decision

**Our approach: pixel-manipulation preset functions (not LUT-based)**

We use a `'filter'` effect type with named preset functions (ported from filerobot) rather than img.ly's `'lut_filter'` with LUT PNG assets. Reasons:

1. **Faster to ship** — no asset pipeline, no async LUT loading, no generation script
2. **No external assets** — presets are pure TypeScript functions, zero-config
3. **Proven code** — filerobot's presets are battle-tested
4. **Forward-compatible** — `'lut_filter'` can be added later as a separate `EffectType` without touching preset filter code

**Property path convention:**
| Property Key | Type | Purpose |
| --- | --- | --- |
| `effect/enabled` | boolean | Whether the effect is active |
| `effect/filter/name` | string | Preset name (e.g. "Clarendon", "" = none) |

**API surface (same entity-based pattern as adjustments):**
| Our API | Purpose |
| --- | --- |
| `createEffect('filter')` | Creates a filter effect block |
| `appendEffect(blockId, effectId)` | Attaches filter to a design block |
| `removeEffect(blockId, index)` | Detaches filter |
| `setString(effectId, 'effect/filter/name', 'Clarendon')` | Sets the active preset |
| `getString(effectId, 'effect/filter/name')` | Reads the active preset |
| `setEffectEnabled(effectId, bool)` | Toggle on/off |
| `isEffectEnabled(effectId)` | Query enabled state |

**Filter composition order:** Adjustments → Filter preset. This matches filerobot's `[...finetunes, filter]` ordering.

**One filter at a time:** Selecting a new preset calls `setString()` on the same effect block — no need to remove/recreate.

## Filter Presets

### Built-in Konva (4)

| Name     | Konva Filter              | Effect                 |
| -------- | ------------------------- | ---------------------- |
| Invert   | `Konva.Filters.Invert`    | Inverts all colours    |
| Sepia    | `Konva.Filters.Sepia`     | Warm brown tone        |
| Solarize | `Konva.Filters.Solarize`  | Partial tone inversion |
| Inkwell  | `Konva.Filters.Grayscale` | Full grayscale         |

### Custom Presets (12, ported from filerobot)

| Name          | Base Operations                                                 | Effect              |
| ------------- | --------------------------------------------------------------- | ------------------- |
| Clarendon     | brightness(0.1), contrast(0.1), saturation(0.15)                | Vivid warm tones    |
| Gingham       | sepia(0.04), contrast(-0.15)                                    | Soft vintage        |
| Moon          | grayscale(), brightness(0.1)                                    | Bright B&W          |
| Lark          | brightness(0.08), adjustRGB([1,1.03,1.05]), saturation(0.12)    | Light airy          |
| Reyes         | sepia(0.4), brightness(0.13), contrast(-0.05)                   | Dusty vintage       |
| Juno          | adjustRGB([1.01,1.04,1]), saturation(0.3)                       | Warm saturated      |
| Aden          | colorFilter([228,130,225,0.13]), saturation(-0.2)               | Pink muted          |
| Amaro         | saturation(0.3), brightness(0.15)                               | Bright saturated    |
| Valencia      | colorFilter([255,225,80,0.08]), saturation(0.1), contrast(0.05) | Warm golden         |
| Hudson        | adjustRGB([1,1,1.25]), contrast(0.1), brightness(0.15)          | Cool blue tint      |
| Rise          | colorFilter([255,170,0,0.1]), brightness(0.09), saturation(0.1) | Warm orange glow    |
| Earlybird     | colorFilter([255,165,40,0.2])                                   | Strong warm overlay |
| Nashville     | colorFilter([220,115,188,0.12]), contrast(-0.05)                | Pink warm           |
| Brooklyn      | colorFilter([25,240,252,0.05]), sepia(0.3)                      | Cool vintage        |
| Willow        | grayscale(), colorFilter([100,28,210,0.03]), brightness(0.1)    | Tinted B&W          |
| BlackAndWhite | threshold at 100 → pure B&W                                     | High-contrast B&W   |

Total: 20 presets + "Original" (no filter)

## Engine Changes

### A. Block types (`block.types.ts`)

Add `'filter'` to EffectType union:

```ts
export type EffectType = "adjustments" | "filter";
```

### B. Property keys (`property-keys.ts`)

One new constant:

```ts
export const EFFECT_FILTER_NAME = "effect/filter/name" as const;
```

### C. Block defaults (`block-defaults.ts`)

New filter effect defaults:

```ts
const FILTER_EFFECT_DEFAULTS = {
  [EFFECT_ENABLED]: true,
  [EFFECT_FILTER_NAME]: "",
};
```

Added to `effectKindDefaults` so `getEffectDefaults('filter')` works.

### D. Konva filter presets (`konva/filters/`)

New files:

- `base-filters.ts` — 8 base pixel operations (brightness, contrast, saturation, grayscale, sepia, adjustRGB, colorFilter, apply) ported from filerobot's `BaseFilters.js`
- `presets/` directory — 16 custom preset filter functions + `index.ts` preset registry
- Registry maps preset name → `{ label, filterFn }` for both custom and Konva built-in presets

### E. Konva renderer (`konva-node-factory.ts`)

Extended `#applyFilters()`:

1. Collect adjustment values → build adjustment pipeline (existing)
2. **NEW:** Find first `'filter'` effect block → read `effect/filter/name` → look up preset function from registry
3. Append preset filter function to pipeline's `filters` array (after adjustments)
4. Apply combined `[...adjustmentFilters, presetFilter]` to Konva node

New private method `#collectFilterPreset()` mirrors `#collectAdjustmentValues()`.

## Image Editor Changes

### A. FilterPanel component (`components/panels/filter-panel.tsx`)

Gallery grid displaying all available presets:

- Each item: preset name label + active indicator
- "Original" item to clear filter
- Active filter highlighted

Props: `{ activeFilter: string; onSelect: (name: string) => void }`

### B. Tool wiring (`image-editor.tsx`)

Follows the exact same pattern as adjustments:

- `filterEffectIdRef` — tracks the filter effect block ID
- `ensureFilterEffect()` — find or create `'filter'` effect on editable block
- `syncFilterState()` — read `effect/filter/name` from engine
- `handleFilterSelect(name)` — set filter name via `setString()`; `''` for Original
- On tool activate: `ensureFilterEffect()` + `syncFilterState()`
- Conditional render `<FilterPanel>` when `activeTool === 'filter'`

## Filerobot Reference Files

| Filerobot File                                  | Purpose                    | Adapted For                       |
| ----------------------------------------------- | -------------------------- | --------------------------------- |
| `custom/filters/BaseFilters.js`                 | 8 base pixel operations    | `base-filters.ts`                 |
| `custom/filters/*.js` (16 files)                | Preset filter definitions  | `presets/*.ts`                    |
| `components/tools/Filters/Filters.constants.js` | Filter registry list       | `presets/index.ts`                |
| `components/tools/Filters/FilterItem.jsx`       | Filter thumbnail component | `filter-panel.tsx` (text-only v1) |
