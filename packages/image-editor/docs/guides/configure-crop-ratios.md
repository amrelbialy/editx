# Configure Crop Aspect Ratios

Define the aspect-ratio presets in the **Crop** tool with `config.crop.aspectRatios`.
Each entry is a `{ id, label, ratio }` object — the same data-driven pattern used by
`resizePresets`. The ratio grid renders your list, in order.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    crop: {
      aspectRatios: [
        { id: "free", label: "Free", ratio: "free" },
        { id: "original", label: "Original", ratio: "original" },
        { id: "1:1", label: "Square", ratio: 1 },
        { id: "16:9", label: "Widescreen", ratio: 16 / 9 },
        { id: "2.39:1", label: "Cinema", ratio: 2.39 },
      ],
    },
  }}
/>;
```

Each preset:

- `id` — stable identifier used to track the active selection.
- `label` — text shown under the ratio icon.
- `ratio` — `width / height` as a number, or the special string `"free"`
  (unconstrained) / `"original"` (the source image's own ratio). Omitting `ratio`
  behaves like `"free"`.

Omit `aspectRatios` to show the built-in ratios: `free`, `original`, `1:1`, `4:3`,
`3:4`, `16:9`, `9:16`.

## Whitelist the built-ins (legacy)

To simply narrow/reorder the built-in ratios without redefining them, pass
`config.crop.presets` — an array of preset ids:

```tsx
<ImageEditor src="/photo.jpg" config={{ crop: { presets: ["1:1", "4:3", "16:9"] } }} />;
```

`presets` filters whichever list `aspectRatios` provides, in the order you list them.

**Verified by:** [tests/guides/configure-crop-ratios.spec.tsx](../../tests/guides/configure-crop-ratios.spec.tsx)
— opens the Crop tool and asserts only the whitelisted ratios render.
