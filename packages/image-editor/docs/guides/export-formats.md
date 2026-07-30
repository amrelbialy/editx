# Control Export Formats

Limit the formats offered in the export dialog and choose which one is selected
by default via `config.export`.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    export: { formats: ["png", "jpeg"], defaultFormat: "jpeg" },
  }}
/>;
```

Supported formats are `png`, `jpeg`, and `webp`. You can also set a default
`quality` (0–1) for the lossy formats and `closeAfterSave` to dismiss the editor
once a save completes.

**Verified by:** [tests/guides/export-formats.spec.tsx](../../tests/guides/export-formats.spec.tsx)
— opens the export dialog, asserts JPEG is preselected and WebP is not offered.
