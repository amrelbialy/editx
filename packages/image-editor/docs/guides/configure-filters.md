# Configure the Filter Tool

Curate the **Filters** tool down to an on-brand shortlist with
`config.filter.presets`. Pass the preset names you want and the panel shows only
those, alongside the always-present **Original** option.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    filter: {
      presets: ["Sepia", "Clarendon", "Moon", "Reyes"],
    },
  }}
/>;
```

Preset names match the built-in filter ids (e.g. `Sepia`, `Clarendon`, `Moon`,
`Invert`, `BlackAndWhite`, `Ludwig`, `Aden`, `1977`). Presets render in the
order you list them. Omit `presets` to show the entire built-in library.

**Verified by:** [tests/guides/configure-filters.spec.tsx](../../tests/guides/configure-filters.spec.tsx)
— opens the Filters tool and asserts only the whitelisted presets (plus
Original) render.
