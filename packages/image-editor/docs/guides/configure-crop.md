# Configure the Crop Tool

Give the Crop tool a set of ready-made output sizes with
`config.crop.resizePresets`. Each group appears under the Crop tool's **Resize**
tab so users can resize to an exact target (social posts, thumbnails, print) in
one click.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    crop: {
      resizePresets: [
        {
          label: "Social",
          presets: [
            { label: "Square", width: 1080, height: 1080 },
            { label: "Portrait", width: 1080, height: 1350 },
            { label: "Story", width: 1080, height: 1920 },
          ],
        },
      ],
    },
  }}
/>;
```

Each entry is a `ResizePresetGroup` — a `label` plus a list of presets, where
every preset has a `label`, `width`, and `height` in pixels. Groups render in
order; the first three presets show by default with a **More** toggle for the
rest. Both `ResizePreset` and `ResizePresetGroup` are exported from
`@editx/image-editor`.

## Crop controls

Crop also applies to graphics that use an image fill. For those graphics, the existing Crop panel
controls frame dimensions, aspect ratios, and resize presets. Canvas handles resize the graphic
frame, while dragging inside the graphic moves the image under its shape mask. The contextual bar
provides all four fit modes, scale, rotation, flips, reset, apply, and cancel. Apply records the
frame and image transform as one undo step; cancel restores the entry state without undoing other
work. The normal Image Fill panel remains available outside Crop for source replacement, fit,
offsets, scale, and opacity.

Two booleans gate the interactive controls around the crop — both default to
`true`:

- `allowCustomRatio` — when `true`, users can crop to a free, unconstrained
  shape and unlock the width/height fields. Set it to `false` to force a fixed
  ratio: free presets are dropped from the ratio grid, the width/height lock
  stays engaged (its toggle is hidden), and the active preset snaps to the first
  constrained ratio.
- `showRotateFlip` — controls the rotate / flip cluster in the crop contextual
  bar above the canvas for page and standalone-image crop. Image-filled graphic
  crop always shows these image-transform controls.

```tsx
<ImageEditor
  src="/photo.jpg"
  config={{
    crop: {
      allowCustomRatio: false,
      showRotateFlip: false,
    },
  }}
/>;
```

`crop.modes` and `crop.defaultMode` are **deprecated**: they are still accepted
for type compatibility but are reserved / not implemented, so the Crop tool
ignores them.

**Verified by:** [tests/guides/configure-crop.spec.tsx](../../tests/guides/configure-crop.spec.tsx)
— opens the Crop tool, switches to the Resize tab, and asserts the configured
group label and preset render.
