# Feature 11 â€” Export

Export the edited image as PNG, JPEG, or WEBP. The user clicks the existing "Export Image" button in the topbar, and the engine renders the page (with all edits) to a `Blob` which is passed to the consumer's `onSave` callback.

---

## Scope

| Layer         | What                                                                  | Status             |
| ------------- | --------------------------------------------------------------------- | ------------------ |
| Engine        | `exportScene(options)` method on `RendererAdapter` + `EditxEngine` | not started        |
| Image Editor  | `useExport` hook, topbar wiring, loading state                        | not started        |
| Export Dialog | Modal with filename/format/quality picker                             | deferred (Phase C) |

---

## Engine Changes

### ExportOptions type

```typescript
interface ExportOptions {
  /** Image format: 'png' | 'jpeg' | 'webp'. Default: 'png'. */
  format?: "png" | "jpeg" | "webp";
  /** Quality 0â€“1 for jpeg/webp. Ignored for png. Default: 0.92. */
  quality?: number;
  /** Device pixel ratio multiplier for high-res export. Default: 1. */
  pixelRatio?: number;
}
```

### RendererAdapter.exportScene

New method on the interface:

```typescript
exportScene(options: ExportOptions): Promise<Blob>;
```

### KonvaRendererAdapter implementation

Zero-flicker approach â€” Konva's `toDataURL` renders to an internal offscreen canvas, so no screen paint occurs:

1. Read page dimensions from `#lastPageSize`.
2. Save `#contentLayer` transform (scale + position).
3. Reset content layer to identity (scale 1, offset 0,0).
4. Hide `#uiLayer` (transformer, crop overlay, selection rect).
5. Call `this.#stage.toDataURL({ x: 0, y: 0, width: pageW, height: pageH, pixelRatio, mimeType, quality })`.
6. Restore content layer transform + UI layer visibility.
7. Convert data URL â†’ `Blob`.
8. Return the Blob.

### EditxEngine facade

```typescript
async exportScene(options?: ExportOptions): Promise<Blob>
```

Delegates to `this.core.getRenderer()!.exportScene(options)` with defaults from config.

---

## Image Editor Changes

### useExport hook

```typescript
function useExport(opts: {
  engineRef: React.RefObject<EditxEngine | null>;
  config: ExportConfig;
  onSave?: (blob: Blob) => void;
  onBeforeSave?: (blob: Blob) => Promise<Blob | undefined> | Blob | undefined;
}): {
  handleExport: () => Promise<void>;
  isExporting: boolean;
};
```

**Flow:**

1. Set `isExporting = true`.
2. Call `engine.exportScene({ format: config.defaultFormat, quality: config.quality })`.
3. If `onBeforeSave` defined, call it with the blob â€” use returned blob if not `undefined`.
4. Call `onSave(finalBlob)`.
5. Set `isExporting = false`.

### Topbar wiring

- Replace `/* TODO: implement export */` with `handleExport()`.
- Pass `isExporting` to `<Topbar>` â€” button shows spinner + disables during export.

---

## Config (already exists)

```typescript
// packages/image-editor/src/config/config.types.ts
interface ExportConfig {
  formats?: ('png' | 'jpeg' | 'webp')[];
  defaultFormat?: 'png' | 'jpeg' | 'webp';
  quality?: number;
}

// packages/image-editor/src/config/default-config.ts
export: {
  formats: ['png', 'jpeg', 'webp'],
  defaultFormat: 'png',
  quality: 0.92,
}
```

No config changes needed.

---

## Verification

1. Load image â†’ apply crop + filter + adjustment + text annotation â†’ Export â†’ `onSave` receives valid Blob.
2. Test PNG, JPEG, WEBP formats â€” correct MIME types.
3. Cropped image export has correct dimensions (crop region, not full canvas).
4. Annotations (shapes, text, overlay images) visible in export.
5. No UI artifacts (transformer handles, crop overlay, selection rects) in exported image.
6. Export button shows spinner, prevents double-click.

---

## Phase C â€” Export Dialog (deferred)

Later enhancement: modal dialog before export with:

- Filename input (default: original filename without extension)
- Format dropdown (from `config.export.formats`)
- Quality slider (0.1â€“1.0, only for jpeg/webp)
- "Export" button

Plus a `downloadBlob(blob, filename)` utility for browser download via `<a download>`.
