# Recipe: Localize the UI

Override any UI string by passing `config.translations`, which is merged over
the built-in English dictionary. Use `config.locale` to label the active locale,
or `config.translateFn` for a fully custom lookup function.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    locale: "es",
    translations: { "tools.crop": "Recortar" },
  }}
/>;
```

Translation keys mirror the built-in dictionary (e.g. `tools.crop`,
`topbar.export`, `bar.done`). Any key you omit falls back to English.

**Verified by:** [tests/recipes/localize.spec.tsx](../../tests/recipes/localize.spec.tsx)
— asserts the Crop tool button renders with the overridden label.
