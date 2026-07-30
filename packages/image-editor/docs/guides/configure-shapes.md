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

**Verified by:** [tests/guides/configure-shapes.spec.tsx](../../tests/guides/configure-shapes.spec.tsx)
— opens the Shapes tool and asserts only the whitelisted shapes render.
