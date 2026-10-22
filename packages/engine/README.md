<div align="center">

# @editx/engine

### Headless, framework-agnostic block engine for building image & creative editors.

Command-pattern undo/redo, Konva 10 renderer, and a lifecycle EventAPI — the core that powers [`@editx/image-editor`](https://www.npmjs.com/package/@editx/image-editor).

**Pure TypeScript, zero UI-framework dependency** — bring it to React, Vue, Svelte, vanilla JS, or no framework at all.

[![npm version](https://img.shields.io/npm/v/@editx/engine.svg)](https://www.npmjs.com/package/@editx/engine)
[![npm downloads](https://img.shields.io/npm/dm/@editx/engine.svg)](https://www.npmjs.com/package/@editx/engine)
[![license](https://img.shields.io/npm/l/@editx/engine.svg)](https://github.com/amrelbialy/editx/blob/main/LICENSE)

[**Documentation**](https://editx-sdk.vercel.app/docs/engine/overview) · [**GitHub**](https://github.com/amrelbialy/editx)

</div>

---

Part of the [Editx](https://github.com/amrelbialy/editx) monorepo.

## Installation

```bash
pnpm add @editx/engine
```


### Peer Dependencies

| Package | Version | Required |
|---------|---------|----------|
| `konva` | `^10.0.0` | Optional — only needed if using the Konva renderer |

## Usage

```ts
import { EditxEngine, IMAGE_SRC } from "@editx/engine";

const engine = new EditxEngine();

// Create a scene — this also creates the first page
await engine.scene.create({ width: 1080, height: 1080 });
const page = engine.scene.getCurrentPage();

// Add an image block to the page
if (page !== null) {
  const image = engine.block.create("image");
  engine.block.setString(image, IMAGE_SRC, "/photo.jpg");
  engine.block.appendChild(page, image);
}
```

### Konva Renderer

To render to a canvas, use the `/konva` subpath. The `createEngine` helper returns an `EditxEngine` with a Konva renderer already attached to your DOM container:

```ts
import { createEngine } from "@editx/engine/konva";

const engine = await createEngine({
  container: document.getElementById("stage")!,
});
```

For advanced setups you can construct the adapter yourself with `KonvaRendererAdapter` and pass it to `new EditxEngine({ renderer })`.

## Key Concepts

- **Blocks** — Everything is a block: pages, images, text, shapes. Each block has typed properties.
- **Command Pattern** — All mutations go through commands, enabling full undo/redo history.
- **EventAPI** — Subscribe to block lifecycle events (`created`, `updated`, `destroyed`).
- **Viewport & transform callbacks** — Typed subscriptions for viewport/interaction: `onZoomChanged`, `onPanChanged`, and the live (pre-commit) `onBlockTransform`. Camera zoom/pan is always clamped (`MIN_ZOOM`–`MAX_ZOOM`).
- **Properties** — Typed property keys (`POSITION_X`, `SIZE_WIDTH`, `FILL_COLOR`, etc.) for reading/writing block state.

### Native document persistence

Use `engine.document` for new editable project storage:

```ts
const json = engine.document.saveToString();
await engine.document.loadFromString(json);
const id = engine.document.getId();
const metadata = engine.document.getMetadata();
```

The JSON envelope is `{ kind: "editx-document", schemaVersion: 1, id, metadata,
scene: { rootSceneId, blocks } }`. It preserves complete authored block state,
including visibility, but excludes active-page/scene navigation, selection, camera,
page-view mode, edit sessions, and export targets. Native loading activates the
root's first page. Identity is stable across saves and canonical loads;
metadata is JSON-only, read-only, and returned as a deeply frozen defensive snapshot.
`scene.create()` retains identity/metadata while establishing the authored root.

The canonical loader also reads legacy v1/v2 scenes, assigning a fresh document ID
and empty metadata while honoring their navigation. Deprecated scene serializers
retain their existing shape and behavior. Successful loading clears history;
renderer/setup failures can reject after replacement, without rollback.
Both loaders validate required fields, unique safe IDs, property shapes, typed
references, reciprocal hierarchy, page ownership, cycles, and navigation before
changing live state. Invalid documents throw exported `DocumentValidationError`
with frozen `issues` (`code`, root-relative `path`, optional source `blockId`,
and `message`); malformed JSON keeps native `SyntaxError`. Validation failure
preserves identity, content, history/redo, editing state, selection, and rendering.
Detached blocks/shared acyclic resources and absent legacy feature properties remain
valid; validation does not insert defaults. Renderer/resource failures after valid
replacement still do not guarantee rollback.

| Input format | `document.loadFromString()` | Deprecated `scene.loadFromString()` |
|---|---|---|
| Native schema v1 | Supported | Not supported |
| Legacy scene v1/v2 | Supported | Supported |
| Other versions | Rejected | Rejected |

Legacy scene versions and native schema versions are separate families. Validated
legacy v1 advances through an explicit v2 step, then both legacy versions convert
to native-v1-compatible content. Conversion is deterministic and forward-only;
no native schema bump is needed. Missing feature properties stay absent, explicit
legacy page selection is honored, and absent/null page selection falls back to the
active scene's first direct page. An absent/null active scene is never inferred.
Legacy identity is generated only when replacement begins, after migration succeeds.
Deprecated scene saves continue writing v2; canonical saves always write native v1.

Save JSON as `.editx.json`. It references external resources and is not an
offline-portable archive. `.editx` ZIP project packaging is planned separately;
rendered multi-page ZIP output is not a native project. Native document codecs
preserve Editx semantics; media importers insert content, structured import/export
converts foreign designs, and render exporters produce final images.
See the [Document API reference](https://editx-sdk.vercel.app/docs/engine/document-api).

### Document change events

```ts
const unsubscribe = engine.document.onChanged((event) => {
  if (event.documentId !== engine.document.getId() || event.origin === "load") return;
  queueAutosave(engine.document.saveToString(), event.documentId, event.transactionId);
});
```

`queueAutosave` is host-provided and should coalesce/serialize saves and report errors.
The frozen event includes `transactionId`, captured `documentId`, `origin`
(`edit`, `undo`, `redo`, `load`, `create`), `changedBlockIds`, and `affectedPageIds`.
One outer batch emits one semantic change; no-op/net-zero transactions emit nothing.
Headless and history-silent mutations are included. Navigation, selection, previews,
saving, and history maintenance alone are excluded. Shared resources report all
affected pages, including deleted IDs. There is no engine-owned clean/saved flag.
Create/load publish once after settlement, even if a later renderer failure rejects;
concurrent edits remain separate. Delayed events keep their original document ID.
See [Document events](https://editx-sdk.vercel.app/docs/engine/document-events).

### Page navigation

`engine.scene.setActivePage(pageId)` validates that the target is a direct page of the active
scene. Invalid targets throw `ActivePageError` without changing navigation or history.
Subscribe with `engine.onActivePageChanged(callback)` or
`engine.scene.onActivePageChanged(callback)`; both return an unsubscribe function and deliver
`{ pageId, previousPageId }`. IDs are nullable when entering or leaving an empty scene.
Selecting the current page does not notify. Navigation preserves undo/redo; removing the active
page selects the first remaining page, while `scene.removePage` rejects removing the final page.
Adding, duplicating, or removing a page is one undo entry, restoring page content, order, and any changed
navigation on undo/redo. Non-active removal preserves later navigation. Page dimensions must be
finite positive numbers; invalid creation fails before mutation.
`engine.scene.duplicatePage(pageId)` returns the new ID, inserts the copy immediately after its
source, and activates it. It preserves names, dimensions, positions, styles, crops, and the complete
child/shape/fill/effect graph with fresh block IDs and remapped internal links. Mutable state is
independent while external resource strings are retained. There is no position offset, name suffix,
or automatic selection change. Undo removes the complete copy and restores prior navigation;
redo restores the same IDs and reactivates the duplicate. Invalid targets or broken subtree
references fail before copy allocation or history changes.
`engine.scene.movePage(pageId, index)` reorders direct pages in one undo step while preserving
content, navigation, selection, camera, and non-page scene-child slots. The final zero-based page
index is clamped to the first/last page; non-finite or fractional indices throw. Unchanged moves
preserve redo and emit nothing. Subscribe with `engine.onPageOrderChanged(callback)` or its
`engine.scene` equivalent for frozen `{ sceneId, pageIds, previousPageIds }` snapshots whenever
the active scene's page list or scene identity changes. There is no initial event; pure activation
and content edits do not notify. Outer batches publish only their final net change, including
silent mutations, and undo/redo preserves subsequent valid navigation.
See the [Scene API reference](https://editx-sdk.vercel.app/docs/engine/scene-api) for details.

### Page properties

Use `scene.getPageProperties(pageId)` for a defensive snapshot of the page's name, width,
height, normalized RGBA `backgroundColor`, and optional string-only `metadata` map.
`scene.setPageProperties(pageId, update)` applies any combination atomically in one undo
step; width and height must be provided together. `scene.resizePage(pageId, width, height)`
and the existing `block.setPageDimensions` use the same command. Dimensions must be finite
and positive, and every background channel must be finite and in `[0, 1]`.

All three scene APIs and `block.setPageDimensions` require a direct page of the active
scene. Resizing changes bounds only: descendants, navigation, selection, camera, other
pages, scene layout, and defaults for future pages are unchanged. Invalid updates fail
before mutation; effective no-ops preserve redo and produce no events or rendering.
Metadata objects replace the complete map; omission retains it, `null` clears it, and `{}`
is a distinct empty map. Metadata is for UI hints, not thumbnail image data or template
metadata. All page properties survive duplication, undo/redo, and native serialization.

### Image fills and graphic crop

Graphic image fills support `crop`, `cover`, `fit`, and `tile` modes plus source-pixel
offsets, scale, rotation, and horizontal or vertical flips. `setFillImage` replaces the complete
image-fill value; use `updateFillImage` when changing only selected fields, such as replacing the
source while preserving its transform.

```ts
engine.block.changeFillKind(graphicId, "image");
engine.block.setFillImage(graphicId, {
  src: "/photo.jpg",
  mode: "crop",
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
});
engine.block.updateFillImage(graphicId, { src: "/replacement.jpg" });
```

Start a renderer-backed crop session with `editor.setEditMode("Crop", { blockId: graphicId })`.
Use `getImageFillCrop`, `updateImageFillCrop`, and `resetImageFillCrop` for live preview state.
`commitCrop()` writes the graphic frame and image transform as one undo entry; `cancelCrop()`
discards the preview without changing document history. Existing image and page crop targets keep
their source-crop behavior. For graphic image-fill sessions, `commitCrop()` returns `null`; read
`getImageFillCrop()` before committing when the final preview frame is needed by the caller.

### Replacing shape geometry

Use `engine.block.setShapeGeometry(graphicId, geometry)` to replace a graphic's shape without
changing its layout, fill, stroke, effects, group membership, or selection. `ShapeGeometry` is a
public discriminated union for `rect`, `ellipse`, `polygon`, `star`, `line`, and named SVG `path`
descriptors. The replacement is one undo entry; omitted primitive options reset to fresh defaults.
Invalid descriptors throw before history changes, while missing or non-shape targets are no-ops.

```ts
engine.block.setShapeGeometry(graphicId, {
  type: "star",
  points: 8,
  innerDiameter: 0.4,
});
```

### Gradients, rich text, and groups

Graphics support linear or radial fill gradients and linear stroke gradients. Text runs add fill
and stroke gradients, highlights, curves, auto width, and laid-out caret or selection geometry.
Text blocks can also own a `text-union` or `frame` background. Range methods use half-open UTF-16
offsets: `[start, end)`.

```ts
engine.block.changeFillKind(graphicId, "gradient");
engine.block.setFillGradient(graphicId, {
  type: "linear",
  angle: 45,
  stops: [
    { offset: 0, color: "#2563eb" },
    { offset: 1, color: "#14b8a6" },
  ],
});
engine.block.setTextGradient(textId, 0, 5, {
  type: "radial",
  stops: [
    { offset: 0, color: "#ffffff" },
    { offset: 1, color: "#ec4899" },
  ],
});

const groupId = engine.block.group([graphicId, textId]);
engine.block.addToGroup(groupId, badgeId);
engine.block.refitGroupBounds(groupId);
```

Grouping sibling blocks under one parent and later membership changes preserve world-space
appearance and are undoable. Initial grouping across different parent hierarchies is unsupported.
Use `enterGroup`, `exitGroup`, and `onGroupContextChanged` for nested editing context.

### Text background geometry

Block-level text backgrounds support two geometry modes through
`engine.block.setTextBackground(id, options)`:

```ts
engine.block.setTextBackground(textId, {
  enabled: true,
  geometry: "frame",
  padding: { top: 12, right: 16, bottom: 12, left: 16 },
});

const background = engine.block.getTextBackground(textId);
// background.geometry is always resolved to "text-union" or "frame".
```

`TextBackgroundOptions.geometry` accepts `"text-union" | "frame"`. Missing or unknown stored
values resolve to `"text-union"` for compatibility. Text-union padding remains signed and preserves
legacy negative/outward behavior. Frame padding represents content insets and is normalized to
nonnegative values by the block API. Geometry and padding updates share one undoable command batch.
The frozen property key is `TEXT_BACKGROUND_GEOMETRY` (`"text/background/geometry"`).

## Reading vs. mutating block state

Reading and writing block state go through two different, clearly separated paths:

- **Reading** — Use the typed getters (`engine.block.getString`, `getFloat`, `getColor`, …) for
  individual properties, or `engine.block.getSnapshot(id)` for a deep, read-only projection of a
  block's full data.
- **Mutating** — All changes must go through commands: `engine.exec(...)` or the typed setters
  (`engine.block.setString`, `setFloat`, `setColor`, …). Only commands are undoable and emit the
  correct lifecycle events. There is no supported way to mutate the store directly.

```ts
// Read a deep, read-only snapshot of a block's full data.
const snapshot = engine.block.getSnapshot(image); // ReadonlyBlockData | null
if (snapshot !== null) {
  console.log(snapshot.type, snapshot.properties);
  // snapshot is DeepReadonly — every field (including nested arrays/objects) is readonly.
}

// Mutate through a command so the change is undoable and emits events.
engine.block.setFloat(image, POSITION_X, 120);
```

> `getSnapshot` returns a `ReadonlyBlockData` (a `DeepReadonly<BlockData>`). It is a clone, so
> assigning to its fields has no effect on engine state — always route mutations through commands.

## Arrange pages on the canvas

```ts
import { PageViewError, type PageViewMode } from "@editx/engine";

const previous: PageViewMode = engine.editor.getPageViewMode(); // "all-pages" initially
engine.editor.setPageViewMode("vertical-pages"); // or "horizontal-pages"
engine.scene.setActivePage(pageId);
engine.editor.fitToScreen();
const frame = engine.editor.getPageViewBounds(pageId);
if (frame) {
  const screenPoint = engine.editor.worldToScreen({ x: frame.x + 20, y: frame.y + 30 });
}
engine.editor.setPageViewMode(previous);
```

Page view is transient editor state, not document visibility or persisted
`scene.setPageLayout`. Continuous modes arrange all pages in document order, with a
48-world-unit gap and centered cross-axis alignment. Transient renderer wrappers preserve
authored page/block coordinates and page-local drag/transform commits. `"active-page"`
remains available for optional isolation; `"all-pages"` retains the legacy shared origin.

In continuous modes, camera bounds cover the union of arranged pages. `fitToScreen()`
centers the active page frame, including boundary pages; `fitToSelection()` uses rendered
bounds, including group transforms, center-origin shape rotation, and the page offset.
Hidden containers defer their first fit until measurable; later resizes preserve zoom
and re-clamp the current pan. Contacting a canvas page activates it
without moving the camera. Ordinary wheel input pans along the
layout axis (native horizontal wheel input is also supported); Ctrl/Cmd-wheel zooms.
Page switches clear old selection/group context and cancel crop/text editing state.
In continuous modes, clicking/tapping a page background selects the page block with
an outline only, without resize/rotation handles or movement. Artwork remains independently
selectable, and additive artwork selection excludes any previously selected page.
Reconciliation covers commands, silent/nested batches, loads, page order/size changes,
removal, and undo/redo without creating history or rewriting serialized block data.
Native loading ends crop/text sessions and clears selection/group context before replacing
blocks, including sessions for previously removed blocks and reused IDs.

`getPageViewBounds(pageId)` returns layout-world `{ x, y, width, height }`, or `null` for
an unknown/unpresented page or unsupported adapter. `worldToScreen`/`screenToWorld` are
inverse camera transforms over layout-world coordinates. Add the page frame origin to
a page-local point before converting to screen; subtract it after converting back.
Block screen rectangles/transforms already include the offset: do not add it again.

Requesting a nonlegacy mode without a renderer or its optional capabilities throws `PageViewError` with
`NO_RENDERER` or `UNSUPPORTED_RENDERER`; the old mode remains unchanged.
Invalid mode values throw `TypeError`. After engine disposal the getter retains the
last mode, but the setter throws `PageViewError` with `ENGINE_DISPOSED`.
Setting `"all-pages"` is supported by headless engines and legacy adapters.

Custom adapters may implement synchronous, idempotent `setPageView(view: RendererPageView)`.
Legacy and isolation descriptors are `{ mode: "all-pages" }` and
`{ mode: "active-page", activePageId }`. Continuous descriptors additionally contain
ordered `pages: readonly { id, width, height }[]` and require the adapter's
`getPageViewBounds(pageId)` capability. The optional `onPagePointerDown(pageId)` callback
runs once at primary pointer/single-touch start in continuous views, before page-local
click, drag, or marquee handling, not again on click/tap completion. Marquee selection
stays on its starting page, or the active page when started between pages. Camera pan/zoom,
transformer handles, editing overlays, and legacy views do not trigger page activation.
Continuous page-background clicks use `onBlockClick` with the page ID; clicks between
pages still use `onStageClick`. Legacy background-click behavior is unchanged.
Existing adapters remain compatible.

All export methods ignore transient layout/filtering. Page/thumbnail exports remain
detached; legacy scene/block exports retain shared-origin sizing and order. Live wrapper
positions, camera, visibility, selection, and transformer state are restored even if capture fails.

## Export a page

Export any direct page of the active scene, including a background page:

```ts
const blob = await engine.exportPage(pageId, {
  format: "webp", // "png" (default), "jpeg", or "webp"
  quality: 0.9, // default 0.92; ignored for PNG
  pixelRatio: 2, // default 1
});
```

The output uses the target page's dimensions, background, and owned artwork, clipped
to its bounds. It excludes other pages and live editing previews. Authored visibility
and opacity are honored; view-only filtering does not change the export target.
Active page, selection, camera, group context, document, history, and redo are untouched.
Concurrent exports capture independent committed snapshots before waiting for resources.

The built-in Konva adapter waits for target images (including page backgrounds and
image fills), processing, and used text fonts before laying out text. Browser-detectable
font failures are reported; family-name-only fonts can still resolve to system fallbacks.
Strict missing-family detection requires the future font registry.

`PageExportError` identifies the `pageId` and a stable `code`: `NO_ACTIVE_SCENE`,
`PAGE_NOT_FOUND`, `NO_RENDERER`, `UNSUPPORTED_RENDERER`, `IMAGE_LOAD_FAILED`,
`FONT_LOAD_FAILED`, or `RENDER_FAILED`. Resource errors include `blockId`, `resource`,
and the original `cause` when available. Unexportable/CORS-tainted images and unsupported
encoders reject explicitly. Invalid options reject with `TypeError`/`RangeError`:
quality must be finite in `[0, 1]`, and pixel ratio must be finite and positive.

Custom `RendererAdapter` implementations may add the optional `exportPage` capability.
Older adapters remain compatible, but page export rejects rather than switching pages
or falling back to `exportScene`. Existing scene and block export behavior is unchanged.

## Export a page thumbnail

```ts
const blob = await engine.exportPageThumbnail(pageId, {
  maxWidth: 256,
  maxHeight: 256,
  format: "png",
  quality: 0.92,
});
const previewUrl = URL.createObjectURL(blob);
// Revoke the URL when the consumer no longer needs it.
URL.revokeObjectURL(previewUrl);
```

All options are optional. The default is a PNG fitted within a 256-by-256-pixel box.
The complete page keeps its proportions, with no cropping, padding, or enlargement.
Bounds must be positive integers. Request a larger box for higher-density previews;
there is no separate thumbnail `pixelRatio` option. JPEG/WebP quality validation and
resource/rendering errors are the same as `exportPage`.

Thumbnails use the same isolated rendering path, assets/fonts, authored visibility,
and state guarantees as page exports. Raster dimensions use that path's canvas rounding;
fractional page sizes can round down, and output that rounds to zero pixels rejects.

Each engine privately remembers up to 64 successful thumbnails with least-recently-used
eviction. Identical in-flight requests share work; failures are not cached. Lookups use
page content and its owned shape/fill/effect dependencies, not event delivery timing.
Editing one page does not invalidate an unrelated page. Shared dependencies affect all
their owners. Silent/batched edits, undo/redo, and native reloads are handled; returning
to equivalent content may reuse a cached result. Scene page order and navigation are
not part of a page's cache key.

An export already in flight returns its invocation-time content, not later edits.
Engine disposal releases cached references and rejects late thumbnail completions.
The engine caches `Blob`s, never object URLs; consumers own and revoke their URLs.
Changing remote image bytes or font availability without changing document references
cannot be detected. Use versioned image sources and update font descriptors when needed;
resource-registry invalidation remains part of the later asset/font milestones.

## Export a block

With a renderer attached, export a graphic, text, image, or group into a fixed output frame:

```ts
const blob = await engine.exportBlock(groupId, {
  width: 1200,
  height: 630,
  padding: 24,
  pixelRatio: 2,
});
```

## Exports

The package exports:

- `EditxEngine` — Main engine class
- `BlockAPI` — Block manipulation, queries, and read-only snapshots
- `EventAPI` — Block event subscriptions
- Event/viewport types — `BlockTransformEvent`, `BlockTransformPhase`, `ViewportState`, `EditModeChange`
- Property keys — `POSITION_X`, `SIZE_WIDTH`, `FILL_COLOR`, `CROP_*`, `EFFECT_*`, etc.
- Types — `ReadonlyBlockData`, `DeepReadonly<T>` (for read-only snapshots), and the public
  `EditxEngine` type (type against `EditxEngine`, not internal core interfaces).
- Utilities — `loadImage`, `colorToHex`, `hexToColor`, `CROP_PRESETS`, `FILTER_PRESETS`, etc.

## License

[MIT](../../LICENSE)
