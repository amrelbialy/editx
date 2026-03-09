# Feature 4: Adjustments (Full Suite)

**Status:** in progress

## User Story

As a user, I click the Adjust tool in the toolbar. A side panel appears with 12 adjustment sliders organized into two groups: Basic (Brightness, Saturation, Contrast, Gamma) and Refinements (Clarity, Exposure, Shadows, Highlights, Blacks, Whites, Temperature, Sharpness). I drag a slider and the image updates in real time. Each slider change is an undo step. I can click "Reset All" to restore all adjustments to their defaults. Adjustments compose correctly with crop, rotation, and flip.

## Scenarios

### Adjust brightness

1. User clicks "Adjust" in toolbar
2. Side panel appears with sliders in Basic / Refinements groups
3. User drags the Brightness slider → image brightness changes in real time
4. Releasing the slider commits the change as an undoable operation

### Multiple adjustments

1. User increases Brightness to 0.3
2. User increases Contrast to 0.2
3. User increases Temperature to 0.3
4. All three compose correctly — image shows combined effect
5. Ctrl+Z undoes Temperature, then Contrast, then Brightness individually

### Reset all

1. User has modified several adjustments
2. User clicks "Reset All" → all sliders snap to 0, image returns to original
3. Single undo step reverts the entire reset

### Compose with crop and rotate

1. User crops the image (Feature 2)
2. User rotates the image (Feature 3)
3. User opens Adjust and increases Contrast
4. All three effects render correctly together
5. Undo works in correct order: Contrast → Rotation → Crop

## img.ly CE.SDK Reference

In img.ly's CE.SDK, adjustments are modeled as a **separate effect block** within the Block Effects system:

```ts
// img.ly approach: adjustments are a separate effect entity
const effect = engine.block.createEffect("adjustments");
engine.block.appendEffect(imageBlock, effect);
engine.block.setFloat(effect, "effect/adjustments/brightness", 0.2);
engine.block.setFloat(effect, "effect/adjustments/contrast", 0.15);
engine.block.setFloat(effect, "effect/adjustments/saturation", 0.1);
```

**img.ly effect types:** `adjustments`, `extrude_blur`, `pixelize`, `vignette`, `half_tone`, `lut_filter`, `duotone`

**img.ly adjustment properties:** `brightness`, `saturation`, `contrast`, `exposure` (accessed via `setFloat()` on the effect block)

**img.ly APIs used:**

- `block.createEffect('adjustments')` — creates an adjustment effect block
- `block.appendEffect(block, effect)` — attaches effect to a design block
- `block.insertEffect(block, effect, index)` — inserts effect at position
- `block.setFloat(effect, 'effect/adjustments/<param>', value)` — sets a parameter
- `block.setEffectEnabled(effect, bool)` / `block.isEffectEnabled(effect)` — toggle
- `block.getEffects(block)` — lists all attached effects
- `block.removeEffect(block, index)` — removes by index
- `block.findAllProperties(effect)` — lists available properties
- Feature toggle: `cesdk.feature.enable('ly.img.adjustment')`

**Reference:** https://img.ly/docs/cesdk/js/filters-and-effects/apply-2764e4/

## Architecture Decision

**Aligned with img.ly's entity-based effect model:** Adjustments are modeled as separate **effect blocks** (`type='effect'`, `kind='adjustments'`) attached to design blocks via `createEffect()` → `appendEffect()`. This mirrors img.ly's CE.SDK Effects system for forward compatibility with multi-block design and future effect types (blur, vignette, LUT filters, etc.).

**Why entity-based effects (not flat properties):**

1. **Multi-block future** — Effect blocks can be shared, reordered, or stacked; flat properties can't
2. **img.ly alignment** — Same API shape: `createEffect('adjustments')` → `appendEffect(block, effect)` → `setFloat(effect, 'effect/adjustments/brightness', 0.2)`
3. **Extensibility** — New effect types (blur, vignette, LUT) follow the same pattern without schema changes
4. **Effect lifecycle** — Enable/disable, reorder, remove individual effects independently

**Property path convention** (matches img.ly):
| Property Key | Purpose |
| --- | --- |
| `effect/enabled` | Boolean — whether the effect is active |
| `effect/adjustments/brightness` | Float — brightness adjustment |
| `effect/adjustments/saturation` | Float — saturation adjustment |
| `effect/adjustments/contrast` | Float — contrast adjustment |
| `effect/adjustments/gamma` | Float — gamma correction |
| `effect/adjustments/clarity` | Float — local contrast (clarity) |
| `effect/adjustments/exposure` | Float — exposure adjustment |
| `effect/adjustments/shadows` | Float — shadows adjustment |
| `effect/adjustments/highlights` | Float — highlights adjustment |
| `effect/adjustments/blacks` | Float — black point adjustment |
| `effect/adjustments/whites` | Float — white point adjustment |
| `effect/adjustments/temperature` | Float — colour temperature (warm/cool) |
| `effect/adjustments/sharpness` | Float — sharpness |

**API surface** (entity-based, mirrors img.ly):
| Our API | img.ly Parallel |
| --- | --- |
| `createEffect('adjustments')` | `block.createEffect('adjustments')` |
| `appendEffect(blockId, effectId)` | `block.appendEffect(block, effect)` |
| `insertEffect(blockId, effectId, index)` | `block.insertEffect(block, effect, index)` |
| `removeEffect(blockId, index)` | `block.removeEffect(block, index)` |
| `getEffects(blockId)` | `block.getEffects(block)` |
| `supportsEffects(blockId)` | `block.supportsEffects(block)` |
| `setEffectEnabled(effectId, bool)` | `block.setEffectEnabled(effect, bool)` |
| `isEffectEnabled(effectId)` | `block.isEffectEnabled(effect)` |
| `setFloat(effectId, key, value)` | `block.setFloat(effect, key, value)` |
| `getFloat(effectId, key)` | `block.getFloat(effect, key)` |
| `findAllProperties(effectId)` | `block.findAllProperties(effect)` |

**Convenience metadata** (`ADJUSTMENT_CONFIG`, `ADJUSTMENT_PARAMS`): Maps param names to their property keys and valid ranges. Used by UI components for slider configuration.

**Undo/history:** Effect block creation and attachment produce patches via the existing command/history system. Property changes on effect blocks use the same `SetPropertyCommand` as regular blocks. `effectIds` is part of `BlockData`, so snapshot/restore handles attachment changes automatically.

**Konva filter approach:** Built-in Konva filters are used where available (Brighten, Contrast, HSV). Custom filter functions handle Temperature, Sharpness, Exposure, Highlights/Shadows, Gamma, Clarity, Blacks, and Whites.

**Cache management:** Konva requires `node.cache()` before filters take effect. We only cache when at least one adjustment is non-default, and `clearCache()` when all are reset — this avoids performance overhead on non-adjusted images.

## Adjustment Parameters

### Basic (4)

| Parameter  | Property Key                    | Range   | Default | Step | Konva Filter             |
| ---------- | ------------------------------- | ------- | ------- | ---- | ------------------------ |
| Brightness | `effect/adjustments/brightness` | -1 to 1 | 0       | 0.05 | `Konva.Filters.Brighten` |
| Saturation | `effect/adjustments/saturation` | -1 to 1 | 0       | 0.05 | `Konva.Filters.HSV`      |
| Contrast   | `effect/adjustments/contrast`   | -1 to 1 | 0       | 0.05 | `Konva.Filters.Contrast` |
| Gamma      | `effect/adjustments/gamma`      | -1 to 1 | 0       | 0.05 | Custom: Gamma            |

### Refinements (8)

| Parameter   | Property Key                     | Range   | Default | Step | Konva Filter              |
| ----------- | -------------------------------- | ------- | ------- | ---- | ------------------------- |
| Clarity     | `effect/adjustments/clarity`     | -1 to 1 | 0       | 0.05 | Custom: Clarity           |
| Exposure    | `effect/adjustments/exposure`    | -1 to 1 | 0       | 0.05 | Custom: Exposure          |
| Shadows     | `effect/adjustments/shadows`     | -1 to 1 | 0       | 0.05 | Custom: HighlightsShadows |
| Highlights  | `effect/adjustments/highlights`  | -1 to 1 | 0       | 0.05 | Custom: HighlightsShadows |
| Blacks      | `effect/adjustments/blacks`      | -1 to 1 | 0       | 0.05 | Custom: Blacks            |
| Whites      | `effect/adjustments/whites`      | -1 to 1 | 0       | 0.05 | Custom: Whites            |
| Temperature | `effect/adjustments/temperature` | -1 to 1 | 0       | 0.05 | Custom: Temperature       |
| Sharpness   | `effect/adjustments/sharpness`   | -1 to 1 | 0       | 0.05 | Custom: Sharpness         |

## Engine Changes

### A. Block types (`block.types.ts`)

- `'effect'` added to `BlockType` union
- `EffectType = 'adjustments'` — extensible union for future effect types (blur, vignette, LUT, etc.)
- `effectIds: number[]` added to `BlockData` — ordered list of attached effect block IDs (parallel to `children`)

### B. Property keys (`property-keys.ts`)

`EFFECT_ENABLED` + 12 constants under the `effect/adjustments/` prefix:

```ts
export const EFFECT_ENABLED = "effect/enabled" as const;
export const EFFECT_ADJUSTMENTS_BRIGHTNESS =
  "effect/adjustments/brightness" as const;
export const EFFECT_ADJUSTMENTS_CONTRAST =
  "effect/adjustments/contrast" as const;
// ... 10 more
```

### C. Block defaults (`block-defaults.ts`)

- `ADJUSTMENTS_EFFECT_DEFAULTS` — all 12 adjustment params = 0, `effect/enabled` = true
- `effect` block type in defaults table with `{ [EFFECT_ENABLED]: true }`
- `getEffectDefaults(kind)` — merges base effect defaults + kind-specific defaults

### D. Block store (`block-store.ts`)

New methods:

- `createEffect(effectType)` — creates a block with `type='effect'`, `kind=effectType`, populates with `getEffectDefaults(kind)`
- `appendEffect(blockId, effectId)` — pushes effectId to parent's `effectIds`
- `insertEffect(blockId, effectId, index)` — splices effectId at position
- `removeEffect(blockId, index)` — removes by index, returns removed ID
- `getEffects(id)` — returns copy of `effectIds`
- `destroy()` updated to cascade-destroy attached effects and unlink from parent's `effectIds`

### E. Commands (`controller/commands/`)

Three new undoable commands:

- `CreateEffectCommand` — `store.createEffect()`, returns patch with before=null, after=snapshot
- `AppendEffectCommand` — snapshots parent block before/after `store.appendEffect()`
- `RemoveEffectCommand` — snapshots parent block before/after `store.removeEffect()`

### F. Block API (`block-api.ts`)

Entity-based effect methods:

- `createEffect(type: EffectType): number` — creates effect block via command
- `appendEffect(blockId, effectId)` — attaches effect via command
- `removeEffect(blockId, index): number | null` — detaches effect, returns ID
- `getEffects(blockId): number[]` — returns attached effect IDs
- `supportsEffects(blockId): boolean` — checks if block type supports effects
- `hasEffects(blockId): boolean` — checks if any effects attached
- `setEffectEnabled(effectId, enabled)` — sets `effect/enabled` on effect block
- `isEffectEnabled(effectId): boolean` — reads `effect/enabled`

Retained convenience metadata:

- `ADJUSTMENT_CONFIG` — maps param names to `EFFECT_ADJUSTMENTS_*` keys + ranges
- `ADJUSTMENT_PARAMS` — array of all param names for iteration
- `AdjustmentParam` type and `AdjustmentConfig` interface

### D. Custom Konva filters (`konva/filters/`)

- `warmth.ts` — Increases R channel, decreases B channel
- `sharpness.ts` — Convolution-based unsharp mask
- `exposure.ts` — Gamma curve adjustment
- `highlights-shadows.ts` — Luminance-targeted adjustments
- `vibrance.ts` — Selective saturation boost

### E. Filter pipeline builder (`konva/filters/build-filter-pipeline.ts`)

Takes all 12 values, returns `{ filters, params }`. Only includes filters for non-default values. HSV filter included once even when hue + saturation + value are all set.

### F. Konva renderer (`konva-node-factory.ts`)

Reads adjustment properties from the effect block (found via `getEffects()` on the design block), builds filter pipeline, applies `.filters()` + `.cache()` when active, clears when all defaults.

## Image Editor Changes

### A. AdjustPanel component (`components/panels/adjust-panel.tsx`)

Two groups (Basic / Refinements) each with labelled sliders, numeric display, and "Reset All" button. Follows the same controlled-component pattern as RotatePanel.

### B. Tool wiring (`image-editor.tsx`)

- On tool activate: find or create adjustments effect block (`createEffect('adjustments')` + `appendEffect()`)
- `adjustmentEffectId` — tracked in local state for the active effect block
- `syncAdjustmentState()` — reads all 12 values from the effect block via `getFloat(effectId, key)`
- `handleAdjustmentChange(param, value)` — writes to effect block via `setFloat(effectId, key, value)`
- `handleAdjustmentReset()` — detaches + destroys the effect block, creates a fresh one
- Conditional render `<AdjustPanel>` when `activeTool === 'adjust'`

## Filerobot Reference Files

| Filerobot File               | Purpose                  | Adapt For                |
| ---------------------------- | ------------------------ | ------------------------ |
| `custom/finetunes/Warmth.js` | Warmth filter function   | Custom warmth filter     |
| `BrightnessOptions.jsx`      | Slider UI pattern        | Adjustment slider layout |
| `useFinetune.js`             | State ↔ filter pipeline  | Tool wiring pattern      |
| `LayersBackground.jsx`       | Filter array composition | Pipeline builder         |
