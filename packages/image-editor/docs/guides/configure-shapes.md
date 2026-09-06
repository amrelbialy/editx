# Configure the Shapes Tool

Configure filled, outlined, gradient, image-filled, and abstract graphics with
`config.shapes`. The built-in catalog is organized in a searchable gallery that
you can replace or extend with editable shape presets of your own.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    shapes: {
      additionalPresetGroups: [{
        id: "brand",
        label: "Brand",
        presets: [{
          id: "brand-badge",
          label: "Brand badge",
          shape: { kind: "rect", cornerRadius: 24 },
          fill: {
            kind: "gradient",
            gradient: {
              type: "linear",
              angle: 45,
              stops: [
                { offset: 0, color: "#2563eb" },
                { offset: 1, color: "#14b8a6" },
              ],
            },
          },
          stroke: { color: "#ffffff", width: 4 },
          sizeFraction: 0.35,
        }],
      }],
    },
  }}
/>;
```

## Customize the gallery

Use `presetGroups` to replace every built-in category. Use
`additionalPresetGroups` to retain the built-ins and append your catalog. An
additional group whose `id` matches `filled`, `outline`, `gradient`, `image`, or
`path` appends presets to that row. The gallery searches translated category
labels and preset labels.

Each `ShapePreset` defines real document semantics: `shape`, `fill`, optional
`stroke`, and optional `sizeFraction`. Shapes can use color, gradient, or image
fills. Custom paths provide `pathData` and a `viewBox`. Gallery thumbnails are
rendered from the same authored geometry and paint used for insertion. The
deprecated optional `preview` field is accepted but is not needed.

## Legacy allowlist

The deprecated `shapes.presets` string list is retained for compatibility. Its
ids are `rect`, `ellipse`, `triangle`, `pentagon`, `hexagon`, `star`, and `line`.
It is mapped to one gallery row; prefer `presetGroups` for new integrations.

## Shape defaults

Control how newly added shapes look. These apply only to shapes created after
the config is set; existing shapes keep their own styling.

```tsx
<ImageEditor
  src="/photo.jpg"
  config={{
    shapes: {
      defaultFillMode: "outlined",
      defaultColor: "#3b82f6",
      defaultStrokeColor: "#111827",
      defaultStrokeWidth: 6,
      defaultOpacity: 0.9,
      defaultCornerRadius: 24,
      defaultSize: 0.3,
    },
  }}
/>;
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `defaultFillMode` | `"filled" \| "outlined"` | `"filled"` | Whether new shapes are filled or drawn as an outline. |
| `defaultColor` | `string` | `"#3b82f6"` | Fill color for new shapes. |
| `defaultStrokeColor` | `string` | falls back to `defaultColor` | Stroke color used in outlined mode. |
| `defaultStrokeWidth` | `number` | `0` (auto) | Outline width, in the same units as the editor's stroke **Width** control (0–20). `0` derives a canvas-relative width so the outline stays visible at any image size. |
| `defaultOpacity` | `number` | `1` | Starting opacity (0–1) for new shapes. |
| `defaultCornerRadius` | `number` | `0` | Corner radius in canvas px applied to new rectangles. |
| `defaultSize` | `number` | `0.5` | Starting size as a fraction (0–1) of the smaller canvas edge when a preset omits `sizeFraction`. |

**Verified by:** [tests/guides/configure-shapes.spec.tsx](../../tests/guides/configure-shapes.spec.tsx)
— opens the Shapes tool and asserts only the whitelisted shapes render.
