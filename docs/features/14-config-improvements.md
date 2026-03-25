# Feature 14 — Config System Improvements

Improve `ImageEditorConfig` by adopting the best patterns from **Filerobot** (block style defaults, per-shape config, rich crop options, export enhancements) and **img.ly CE.SDK** (granular feature flags, interaction settings, canvas appearance). Ordered by priority: fix what's broken first, fill high-impact gaps, then add new capabilities.

**References:**
- Filerobot: `temp/filerobot-image-editor/packages/react-filerobot-image-editor/src/`
- img.ly CE.SDK: https://img.ly/docs/cesdk/react/configuration-2c1c3d/
- Current config: `packages/image-editor/src/config/`

**Terminology:** This codebase uses **"block"** for all canvas elements (`BlockType`, `BlockActionBar`, `BlockPropertiesBar`). Filerobot calls these "annotations" — we translate to "block" throughout.

---

## Phase 1 — Fix Existing Config Wiring *(Quick Wins)*

**Priority: CRITICAL** — Config keys exist but hooks don't read them.

### 1.1 Wire `config.text` into `use-text-tool.ts`

Currently hardcodes `fontFamily: "Arial"` and `fill: "#000000"` instead of reading config.

| What | From | To |
|------|------|----|
| Font family | Hardcoded `"Arial"` | `config.text.fonts[0]` or `config.text.defaultFontFamily` |
| Text color | Hardcoded `"#000000"` | `config.text.defaultColor` (`"#ffffff"` in defaults) |
| Font size | Hardcoded in preset | `config.text.defaultFontSize` (`24` in defaults) |

**Files:** `packages/image-editor/src/hooks/use-text-tool.ts`

### 1.2 Wire `config.shapes` into `use-shapes-tool.ts`

Currently ignores `defaultColor`, `defaultFillMode`, `presets`.

**Files:** `packages/image-editor/src/hooks/use-shapes-tool.ts`

### 1.3 Verify `config.adjust.controls` filters visible sliders

### 1.4 Verify `config.crop.presets` drives the preset grid

---

## Phase 2 — Modal & Close Lifecycle *(Core Product Use Case)*

**Priority: CRITICAL** — Modal is the primary integration pattern. Currently there is no close button, no unsaved-changes guard, and no modal wrapper.

**Architecture: Two-layer approach.**
- `<ImageEditor>` stays a plain block-level content component — embeddable in sidebars, split views, full pages, or custom dialogs.
- New `<ImageEditorModal>` — thin Radix `Dialog` wrapper providing portal, backdrop, focus trap, escape key, and scroll lock.

Consumers who want the 90% case use `<ImageEditorModal>`. Consumers who need custom layout use `<ImageEditor>` directly.

### 2.1 Add close button to `Topbar`

Show an `X` button on the far-left of the topbar when `onClose` is provided. Controlled by `config.ui.showCloseButton` (default: `true` when `onClose` is set).

```tsx
// topbar.tsx — left side, before undo/redo
{onClose && (
  <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
    <X className="h-4 w-4" />
  </Button>
)}
```

Optionally support `config.ui.showBackButton` (arrow-left icon instead of X), with the same `onClose` handler.

**Files:** `packages/image-editor/src/components/shell/topbar.tsx`

### 2.2 Track unsaved changes

Derive `hasUnsavedChanges` from the engine's undo history:

```ts
// In store or hook
const hasUnsavedChanges = historyIndex !== lastSaveIndex;
```

Set `lastSaveIndex = historyIndex` after a successful save. Expose via `useImageEditorStore`.

**Files:** `packages/image-editor/src/store/image-editor-store.ts`

### 2.3 Unsaved changes confirmation dialog

When close is triggered and `hasUnsavedChanges === true`, show a Radix `AlertDialog` inside `<ImageEditor>` (not in the modal wrapper — even inline editors need this). Controlled by `config.ui.unsavedChangesWarning` (default: `true`).

Options: **Discard** (close without saving), **Cancel** (stay in editor), optionally **Save & Close** (if `closeAfterSave` is enabled).

**Files:**
- New: `packages/image-editor/src/components/shell/discard-confirmation-dialog.tsx`
- Modify: `packages/image-editor/src/image-editor.tsx`

### 2.4 Enrich `onClose` with reason + unsaved flag

Update `ImageEditorProps.onClose` signature:

```ts
type CloseReason = "save" | "close-button" | "back-button" | "escape";

onClose?: (reason: CloseReason, hasUnsavedChanges: boolean) => void;
```

Backward compatible — if the consumer passes `() => void`, extra args are ignored.

**Files:** `packages/image-editor/src/image-editor.tsx`, `packages/image-editor/src/config/config.types.ts`

### 2.5 Create `<ImageEditorModal>` wrapper

Thin wrapper (~60 lines) using Radix `Dialog`:

```tsx
export interface ImageEditorModalProps extends ImageEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = (props) => {
  const { open, onOpenChange, ...editorProps } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 bg-black/80" />
        <DialogContent className="fixed inset-0 p-0">
          <ImageEditor {...editorProps} />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};
```

Radix handles: portal rendering, backdrop click, focus trap, `Escape` key, scroll lock.

**Files:**
- New: `packages/image-editor/src/image-editor-modal.tsx`
- Modify: `packages/image-editor/src/index.ts` (export both components)

### 2.6 Wire `closeAfterSave` in export flow

When `config.export.closeAfterSave === true`, call `onClose("save", false)` after a successful save.

**Files:** `packages/image-editor/src/hooks/use-export.ts`

### 2.7 Update demo app to use `<ImageEditorModal>`

Replace the current conditional rendering pattern with the modal wrapper.

**Files:** `apps/demo/src/app.tsx`

---

## Phase 3 — Block Style Defaults & Per-Shape Config

**Priority: HIGH** — Filerobot's strongest pattern, fills a major gap.
**Parallel with:** Phase 1.

### 3.1 Add `BlockStyleDefaults` interface

Shared style base for all blocks (Filerobot's `annotationsCommon`).

```ts
interface BlockStyleDefaults {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadow?: {
    offsetX: number;
    offsetY: number;
    blur: number;
    color: string;
    opacity: number;
  };
}
```

**Filerobot ref:** `defaultConfig.js` L14-25 (`annotationsCommon`).

### 3.2 Expand `ShapesToolConfig` with per-shape defaults

```ts
type LineCap = "butt" | "round" | "square";

interface ShapesToolConfig {
  // Existing
  presets?: string[];
  defaultFillMode?: "filled" | "outlined";
  defaultColor?: string;

  // NEW — shared base for all shape blocks
  blockDefaults?: BlockStyleDefaults;

  // NEW — per-shape overrides (from Filerobot per-tool config + CE.SDK shape.options)
  rect?: { cornerRadius?: number } & Partial<BlockStyleDefaults>;
  ellipse?: Partial<BlockStyleDefaults>;
  polygon?: { sides?: number } & Partial<BlockStyleDefaults>;
  arrow?: {
    pointerLength?: number;
    pointerWidth?: number;
    lineCap?: LineCap;
  } & Partial<BlockStyleDefaults>;
  line?: { lineCap?: LineCap } & Partial<BlockStyleDefaults>;
  pen?: {
    tension?: number;
    lineCap?: LineCap;
    selectAfterDrawing?: boolean;
  } & Partial<BlockStyleDefaults>;
}
```

**Filerobot ref:** `[TOOLS_IDS.RECT]`, `[TOOLS_IDS.POLYGON]`, etc.
**CE.SDK ref:** `ly.img.shape.options.cornerRadius`, `ly.img.shape.options.sides`.

### 3.3 Expand `TextToolConfig` with richer defaults

```ts
interface TextToolConfig {
  // Existing
  fonts?: (string | { label: string; value: string })[];
  defaultFontSize?: number;
  defaultColor?: string;

  // NEW
  defaultFontFamily?: string;
  letterSpacing?: number;                          // Filerobot default: 0
  lineHeight?: number;                             // Filerobot default: 1
  align?: "left" | "center" | "right";             // Filerobot default: 'left'
  defaultFontStyle?: "normal" | "italic";
  defaultFontWeight?: "normal" | "bold";
  onFontChange?: (fontFamily: string) => void;     // Filerobot callback for font loading
}
```

### 3.4 Add defaults to `default-config.ts`

### 3.5 Update `use-text-tool.ts` and `use-shapes-tool.ts` to consume new config

---

## Phase 4 — Crop Config Enhancements

**Priority: HIGH** — Crop is the most-used tool. Current config is thin vs both competitors.
**Parallel with:** Phase 3.

### 4.1 Expand `CropToolConfig`

```ts
interface CropToolConfig {
  // Existing
  presets?: (string | CropPresetItem)[];
  modes?: ("crop" | "cover" | "fit")[];
  defaultMode?: "crop" | "cover" | "fit";
  allowCustomRatio?: boolean;
  showStraighten?: boolean;
  showRotateFlip?: boolean;
  resizePresets?: ResizePresetGroup[];

  // NEW — from Filerobot
  minWidth?: number;                               // Min crop area px (default: 14)
  minHeight?: number;                              // Min crop area px (default: 14)
  maxWidth?: number | null;                        // Max crop area (default: null)
  maxHeight?: number | null;                       // Max crop area (default: null)
  defaultRatio?: string | number | null;           // Initial ratio (default: null = free)
  autoResize?: boolean;                            // Auto-resize output to crop (default: false)
  ellipticalCrop?: boolean;                        // Ellipse crop shape (default: false)
  lockCropAreaAt?: CropAnchorPosition | null;      // Lock position (default: null)

  // NEW — from CE.SDK
  doubleClickToCrop?: boolean;                     // Double-click enters crop (default: true)

  // NEW — rotate sub-config (Filerobot Rotate tool)
  rotate?: {
    maxAngle?: number;                             // Max rotation ° (default: 45)
    componentType?: "slider" | "buttons";          // UI style (default: 'slider')
    step?: number;                                 // Button step ° (default: 90)
  };
}

type CropAnchorPosition =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center-center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";
```

### 4.2 Upgrade crop presets from `string[]` to typed items

Backward compatible — plain strings still work, objects enable richer presets.

```ts
type CropPresetItem = string | {
  label: string;
  ratio: string | number | "custom" | "original" | "ellipse";
  icon?: React.ComponentType<{ className?: string }>;
  width?: number;
  height?: number;
};

// Optional grouped presets (Filerobot's presetsFolders pattern)
interface CropPresetGroup {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  items: CropPresetItem[];
}
```

### 4.3 Update `default-config.ts` with new crop defaults

### 4.4 Update crop-panel and contextual bar to respect new config

---

## Phase 5 — Export & Lifecycle Enhancements

**Priority: HIGH** — Directly impacts user-facing workflows.
**Parallel with:** Phases 3-4.

### 5.1 Expand `ExportConfig`

```ts
interface ExportConfig {
  // Existing
  formats?: ExportFormat[];
  defaultFormat?: ExportFormat;
  quality?: number;

  // NEW — from Filerobot
  defaultFileName?: string;                        // Without extension
  savingPixelRatio?: number;                       // Retina multiplier (default: 1)
  previewPixelRatio?: number;                      // Canvas DPR (default: devicePixelRatio)
  forcePngForEllipticalCrop?: boolean;             // Transparency (default: true)

  // NEW — from CE.SDK / Filerobot behavior
  closeAfterSave?: boolean;                        // Auto-close after save (default: false)
  disableSaveIfNoChanges?: boolean;                // Grey out button (default: false)
  removeSaveButton?: boolean;                      // Hide entirely (default: false)
}
```

### 5.2 Enrich `EditorEventCallbacks`

```ts
type CloseReason = "save" | "close-button" | "back-button" | "escape";

interface SavedImageData {
  blob: Blob;
  name: string;
  extension: string;
  mimeType: string;
  width: number;
  height: number;
  quality?: number;
}

interface EditorEventCallbacks {
  // Existing
  onToolChange?: (toolId: string | null) => void;
  onBeforeSave?: (blob: Blob) => Promise<Blob | undefined> | Blob | undefined;

  // NEW
  onClose?: (reason: CloseReason, hasUnsavedChanges: boolean) => void;
  onModify?: (designState: unknown) => void;
  onSave?: (data: SavedImageData) => void;
}
```

**Filerobot ref:** `savedImageData`, `closingReasons`, `onModify`.

### 5.3 Update `use-export.ts`, `export-dialog.tsx`, `image-editor.tsx`

---

## Phase 6 — Granular Feature Flags

**Priority: HIGH** — CE.SDK's best pattern. Enables "show crop but hide rotate."
**Depends on:** Phase 4 (crop sub-config).

### 6.1 Add `features` to `ImageEditorConfig`

```ts
interface ImageEditorConfig {
  // ...existing
  features?: FeatureFlags;
}

interface FeatureFlags {
  // Per-tool (override tools[] for finer control)
  crop?: boolean | CropFeatureFlags;
  adjust?: boolean | AdjustFeatureFlags;
  filter?: boolean;
  text?: boolean | TextFeatureFlags;
  shapes?: boolean | ShapesFeatureFlags;
  image?: boolean;

  // Global capabilities
  undoRedo?: boolean;
  delete?: boolean;
  duplicate?: boolean;
  export?: boolean;
  zoomControls?: boolean;
}

interface CropFeatureFlags {
  rotate?: boolean;
  flip?: boolean;
  straighten?: boolean;
  resize?: boolean;
}

interface AdjustFeatureFlags {
  [controlName: string]: boolean;
}

interface TextFeatureFlags {
  typeface?: boolean;
  fontSize?: boolean;
  fontStyle?: boolean;
  alignment?: boolean;
  color?: boolean;
}

interface ShapesFeatureFlags {
  cornerRadius?: boolean;
  sides?: boolean;
  fill?: boolean;
  stroke?: boolean;
}
```

**CE.SDK ref:** `cesdk.feature.enable('ly.img.crop')`, `cesdk.feature.disable('ly.img.text.typeface')`.
Simpler than CE.SDK's predicate system — just booleans, covers 90% of use cases.

### 6.2 Create `useFeature()` hook

New file: `packages/image-editor/src/hooks/use-feature.ts`

Resolves hierarchy: `features.crop.rotate` → `features.crop` (if boolean) → `tools[]` array.

### 6.3 Update components to use `useFeature()`

| Component | Feature checks |
|-----------|---------------|
| `tool-nav.tsx` | `features[toolId]` |
| `crop-panel.tsx` | `features.crop.rotate`, `.flip`, `.straighten` |
| `topbar.tsx` | `features.undoRedo`, `.export`, `.zoomControls` |
| `block-action-bar.tsx` | `features.delete`, `.duplicate` |

### 6.4 Update `default-config.ts` — all features enabled by default

---

## Phase 7 — Interaction & Canvas Config

**Priority: MEDIUM** — Engine behavior customization from CE.SDK's depth.

### 7.1 Add `InteractionConfig`

```ts
interface InteractionConfig {
  scrollZoom?: boolean;                            // CE.SDK mouse/enableZoom (default: true)
  scrollPan?: boolean;                             // CE.SDK mouse/enableScroll (default: true)
  pinchAction?: "none" | "zoom" | "scale";         // CE.SDK touch/pinchAction (default: 'zoom')
  touchPan?: boolean;                              // CE.SDK touch/singlePointPanning (default: true)
  showResizeHandles?: boolean;                     // CE.SDK controlGizmo (default: true)
  showRotateHandles?: boolean;                     // CE.SDK controlGizmo (default: true)
  showCropHandles?: boolean;                       // CE.SDK controlGizmo (default: true)
  snapping?: {
    enabled?: boolean;
    positionThreshold?: number;                    // px (default: 4)
    rotationThreshold?: number;                    // radians (default: 0.15)
    guides?: boolean;                              // Show snap lines (default: true)
  };
  doubleClickBehavior?: "crop" | "edit-text" | "none";
}
```

### 7.2 Add `CanvasConfig`

```ts
interface CanvasConfig {
  backgroundColor?: string;                        // Filerobot previewBgColor
  cropOverlayColor?: string;                       // CE.SDK cropOverlayColor (default: 'rgba(0,0,0,0.39)')
  selectionColor?: string;                         // CE.SDK highlightColor
  dimOutOfBounds?: boolean;                        // CE.SDK page/dimOutOfPageAreas (default: true)
  noCrossOrigin?: boolean;                         // Filerobot noCrossOrigin (default: false)
}
```

### 7.3 Add `ZoomConfig`

```ts
interface ZoomConfig {
  enabled?: boolean;                               // CE.SDK disableZooming (default: true)
  min?: number;                                    // Default: 0.1
  max?: number;                                    // Default: 10
  step?: number;                                   // Increment per click (default: 0.25)
  showPresetsMenu?: boolean;                       // Filerobot useZoomPresetsMenu (default: true)
  showFitButton?: boolean;                         // Filerobot showFitCenterZoomButton (default: true)
  defaultPadding?: number;                         // Fit padding px (default: 24)
}
```

### 7.4 Wire into `ImageEditorConfig`

### 7.5 Update engine adapter/viewport to respect config

### 7.6 Update `default-config.ts`

---

## Phase 8 — UI Config Enhancements

**Priority: MEDIUM** — Extends existing `UIConfig` with commonly-requested options.
**Parallel with:** Phase 7.

### 8.1 Expand `UIConfig`

```ts
interface UIConfig {
  // Existing
  toolSidebar?: { showLabels?: boolean; groupSeparators?: boolean };
  contextualBar?: { show?: boolean };
  title?: string;
  showTitle?: boolean;

  // NEW
  scale?: "compact" | "normal" | "large";          // CE.SDK ui.setScale() (default: 'normal')
  showBackButton?: boolean;                        // Filerobot showBackButton (default: false)
  showCanvasOnly?: boolean;                        // Filerobot headless mode (default: false)
  showImageInfo?: boolean;                         // Dimensions display (default: false)
  unsavedChangesWarning?: boolean;                 // Filerobot (inverted) (default: true)
  undoRedo?: {
    show?: boolean;
    position?: "topbar" | "contextual-bar";
  };
}
```

### 8.2 Update shell components

### 8.3 Update `default-config.ts`

---

## Phase 9 — Adjust Tool Enhancements

**Priority: MEDIUM** — Expand available controls.
**Depends on:** Phase 6 (feature flags for per-control toggling).

### 9.1 Expand `AdjustToolConfig`

```ts
type AdjustControlId =
  // Existing 12
  | "brightness" | "contrast" | "saturation" | "temperature"
  | "sharpness" | "exposure" | "shadows" | "highlights"
  | "blacks" | "whites" | "gamma" | "clarity"
  // NEW from Filerobot finetune
  | "blur" | "hue" | "noise" | "pixelate" | "posterize" | "threshold" | "warmth";

interface AdjustToolConfig {
  controls?: AdjustControlId[];
  showCompareToggle?: boolean;                     // Before/after (default: true)
  showResetAll?: boolean;                          // Reset button (default: true)
}
```

### 9.2 Update `default-config.ts` — keep current 12 as default, new ones opt-in

---

## Phase 10 — Filter Tool Enhancements

**Priority: LOW** — Minor additions.

### 10.1 Expand `FilterToolConfig`

```ts
interface FilterToolConfig {
  showIntensity?: boolean;
  showCompareToggle?: boolean;                     // Before/after (default: true)
  presets?: string[];                              // Which filters to show (default: all)
}
```

---

## Phase 11 — Image Tool & Watermark Config

**Priority: LOW** — New tool configs for future features.

### 11.1 Expand `ImageToolConfig`

```ts
interface ImageToolConfig {
  maxFileSize?: number;
  maxDimension?: number;
  disableUpload?: boolean;                         // Gallery only (default: false)
  gallery?: { url: string; previewUrl: string }[]; // Built-in gallery (Filerobot pattern)
}
```

### 11.2 Add `WatermarkConfig`

```ts
interface WatermarkConfig {
  gallery?: { url: string; previewUrl: string }[];
  textScalingRatio?: number;                       // Default: 0.5
  imageScalingRatio?: number;                      // Default: 0.5
  hideTextWatermark?: boolean;                     // Default: false
}
```

### 11.3 Add new tool IDs

Extend `TOOL_IDS`: `"pen" | "line" | "watermark" | "resize"` — placeholders for future implementation.

---

## Phase 12 — State Save/Restore

**Priority: LOW** — Advanced feature.

### 12.1 Add `loadableDesignState` to `ImageEditorConfig`

Restore from serialized state (Filerobot `loadableDesignState` / CE.SDK `scene.saveToArchive()`).

### 12.2 Expose `getCurrentDesignState()` via ref or callback

Filerobot `getCurrentImgDataFnRef` pattern.

---

## Files

### Must Modify

| File | Phases |
|------|--------|
| `packages/image-editor/src/config/config.types.ts` | 2.4, 3-11 (all type additions) |
| `packages/image-editor/src/config/default-config.ts` | 1-11 (all default values) |
| `packages/image-editor/src/hooks/use-text-tool.ts` | 1.1, 3.5 |
| `packages/image-editor/src/hooks/use-shapes-tool.ts` | 1.2, 3.5 |
| `packages/image-editor/src/hooks/use-export.ts` | 2.6, 5.3 |
| `packages/image-editor/src/components/panels/export-dialog.tsx` | 5.3 |
| `packages/image-editor/src/image-editor.tsx` | 2.3, 2.4 (close lifecycle) |
| `packages/image-editor/src/components/shell/topbar.tsx` | 2.1 (close/back button), 6.3, 8.2 |
| `packages/image-editor/src/store/image-editor-store.ts` | 2.2 (unsaved changes tracking) |
| `packages/image-editor/src/index.ts` | 2.5 (export `ImageEditorModal`) |
| `apps/demo/src/app.tsx` | 2.7 (use `ImageEditorModal`) |

### Must Create

| File | Phase |
|------|-------|
| `packages/image-editor/src/image-editor-modal.tsx` | 2.5 |
| `packages/image-editor/src/components/shell/discard-confirmation-dialog.tsx` | 2.3 |
| `packages/image-editor/src/hooks/use-feature.ts` | 6.2 |

### May Modify

| File | Phases |
|------|--------|
| `packages/image-editor/src/config/config-context.tsx` | If merge logic needs updating |
| `packages/image-editor/src/components/shell/tool-nav.tsx` | 6.3 |
| `packages/image-editor/src/components/panels/crop-panel.tsx` | 4.4 |
| `packages/image-editor/src/components/shell/block-action-bar.tsx` | 6.3 |
| `packages/engine/src/editor/editor-api.ts` | 7.5 |
| `packages/engine/src/editor/editor-viewport.ts` | 7.5 |

---

## Verification

1. `pnpm build` — all new types compile
2. `pnpm test` — no regressions
3. Text tool reads `config.text.defaultColor` instead of hardcoded `#000000`
4. Shapes tool reads `config.shapes.defaultColor` instead of hardcoded value
5. `<ImageEditor src="photo.jpg" />` uses all defaults (minimal config)
6. `<ImageEditor config={{ crop: { minWidth: 100 } }} />` merges without losing other crop defaults
7. `config={{ features: { crop: { rotate: false } } }}` hides rotate controls
8. `config.export.defaultFileName` appears in export dialog
9. `pnpm check` passes (Biome)
10. Close button appears in topbar when `onClose` is provided
11. Clicking close with unsaved changes shows discard confirmation dialog
12. `<ImageEditorModal open={true} />` renders in a portal with backdrop, focus trap, and escape-to-close
13. `closeAfterSave` triggers `onClose("save", false)` after successful export
14. Demo app uses `<ImageEditorModal>` and modal open/close works correctly

---

## Decisions

- **Two-layer modal architecture** — `<ImageEditor>` is a plain block-level content component (embeddable anywhere). `<ImageEditorModal>` is a thin Radix `Dialog` wrapper for the 90% modal use case. Close button + unsaved-changes guard live inside `<ImageEditor>` so they work in both modes.
- **Declarative config over runtime APIs** — Filerobot-style config object, not CE.SDK's imperative `setSetting()` / `feature.enable()`. Simpler, more React-idiomatic.
- **`features` coexists with `tools`** — `tools[]` controls sidebar visibility. `features` provides sub-feature granularity within each tool.
- **Fully backward compatible** — All new fields optional with sensible defaults. Existing configs unchanged. `onClose` accepts extra args but `() => void` still works.
- **Arrays replaced, not merged** — Current `deepMerge` behavior preserved (`tools`, `presets`, `formats` overwrite).
- **String presets remain valid** — Crop presets accept both `string` and `CropPresetItem` objects.
- **"Block" terminology** — No "annotation" in config types. Filerobot's `annotationsCommon` → our `BlockStyleDefaults` / `blockDefaults`.
- **Config types + defaults only** — This plan does NOT implement new tools (pen, line, watermark) or engine features (snapping, elliptical crop rendering). Those are separate efforts consuming these config types.
- **No runtime config API yet** — CE.SDK's `setTheme()`, `setLocale()` are powerful but deferred. Config is set once at init.
