# Configure the Shapes Tool

Curate which shapes the **Shapes** tool offers with `config.shapes.presets`. Pass
the shape ids you want and the panel shows only those, in the order you list them.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    shapes: {
      presets: ["rect", "ellipse", "star"],
    },
  }}
/>;
```

Shape ids match the built-in shapes: `rect`, `ellipse`, `triangle`, `pentagon`,
`hexagon`, `star`, `line`. Omit `presets` to show every built-in shape.

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
| `defaultSize` | `number` | `0.25` | Starting size as a fraction (0–1) of the smaller canvas edge. |

**Verified by:** [tests/guides/configure-shapes.spec.tsx](../../tests/guides/configure-shapes.spec.tsx)
— opens the Shapes tool and asserts only the whitelisted shapes render.
