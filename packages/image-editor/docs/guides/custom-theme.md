# Customize the Theme

Override individual theme colors, the corner radius, and the font family via
`config.theme`. Values are applied as CSS custom properties on the editor's
`.ie-theme` root element, so they cascade to every control.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    theme: {
      colors: { primary: "#ff3366" },
      borderRadius: "0.75rem",
      fontFamily: "Georgia, serif",
    },
  }}
/>;
```

You can also pass a built-in `preset` (`"light"` / `"dark"`) and override
individual colors on top of it.

**Verified by:** [tests/guides/custom-theme.spec.tsx](../../tests/guides/custom-theme.spec.tsx)
— reads the computed `--primary` and `--radius` custom properties on `.ie-theme`.
