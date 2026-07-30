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
rest.

**Verified by:** [tests/guides/configure-crop.spec.tsx](../../tests/guides/configure-crop.spec.tsx)
— opens the Crop tool, switches to the Resize tab, and asserts the configured
group label and preset render.
