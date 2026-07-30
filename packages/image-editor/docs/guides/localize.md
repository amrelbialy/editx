# Localize the UI

Override any UI string by passing `config.translations`, merged over the built-in
English dictionary. Use `config.locale` to label the active locale, or
`config.translateFn` for a fully custom lookup that reads from your own i18n
catalog.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    locale: "es",
    translations: {
      "topbar.export": "Exportar imagen",
      "tools.crop": "Recortar",
      "tools.adjust": "Ajustar",
      "tools.filter": "Filtros",
      "tools.text": "Texto",
      "tools.shapes": "Formas",
      "tools.image": "Imagen",
    },
  }}
/>;
```

Keys mirror the built-in dictionary (`tools.*`, `topbar.*`, `action.*`,
`panel.*`, `dialog.*`). Any key you omit falls back to English. To source strings
from an existing i18n library, pass `translateFn: (key) => i18n.t(key)` instead of
a static map.

**Verified by:** [tests/guides/localize.spec.tsx](../../tests/guides/localize.spec.tsx)
— asserts the Crop tool button renders with the overridden label.