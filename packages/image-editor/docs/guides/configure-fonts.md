# Configure Text Fonts

Replace the built-in font list with your own using `config.text.fonts`. The
list drives every font-family dropdown in the editor (the selection bar above a
selected text block and the Text Properties panel), and the first entry becomes
the default for newly added text.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    text: {
      fonts: ["Poppins", "Roboto Mono", "Playfair Display"],
      defaultFontFamily: "Poppins",
      defaultFontSize: 32,
      defaultColor: "#ffffff",
    },
  }}
/>;
```

- `fonts` — the ordered list shown in every font picker.
- `defaultFontFamily` — family applied to new text (falls back to `fonts[0]`).
- `defaultFontSize` — base size in px for new text.
- `defaultColor` — fill colour for new text.

Load the matching web fonts yourself (e.g. via a `<link>` or `@font-face`) so
the names you list actually render.

**Verified by:** [tests/guides/configure-fonts.spec.tsx](../../tests/guides/configure-fonts.spec.tsx)
— adds a text block and asserts the font picker lists the configured fonts and
omits the defaults.
