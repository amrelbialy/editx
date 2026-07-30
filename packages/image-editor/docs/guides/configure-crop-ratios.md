# Configure Crop Aspect Ratios

Limit the aspect-ratio presets in the **Crop** tool with `config.crop.presets`.
Pass the preset ids you want and the ratio grid shows only those, in the order you
list them.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    crop: {
      presets: ["1:1", "4:3", "16:9"],
    },
  }}
/>;
```

Preset ids match the built-in ratios: `free`, `original`, `1:1`, `4:3`, `3:4`,
`16:9`, `9:16`. Omit `presets` to show every built-in ratio.

**Verified by:** [tests/guides/configure-crop-ratios.spec.tsx](../../tests/guides/configure-crop-ratios.spec.tsx)
— opens the Crop tool and asserts only the whitelisted ratios render.
