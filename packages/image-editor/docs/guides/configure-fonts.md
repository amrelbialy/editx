# Configure Text

Control the fonts and default styling of the **Text** tool with `config.text`.
The font list drives every font-family picker; the `default*` values seed each new
text block; `presets` defines the style grid; and `min/maxFontSize` bound the size
input.

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
      defaultFontWeight: "normal",
      defaultFontStyle: "normal",
      defaultTextAlign: "left",
      defaultLineHeight: 1.2,
      defaultLetterSpacing: 0,
      minFontSize: 8,
      maxFontSize: 400,
      presets: [
        { id: "title", label: "Title", text: "Title", fontSizeScale: 3.75, fontWeight: "bold" },
        { id: "body", label: "Body", text: "Body text", fontSizeScale: 1 },
      ],
    },
    // Shared swatch palette for every colour picker (text, shapes, background):
    colors: ["#ffffff", "#111827", "#4f46e5", "#e11d48", "#16a34a", "#f59e0b"],
  }}
/>
```

| Option | Purpose |
|---|---|
| `fonts` | Ordered list shown in every font picker (previewed in their own typeface). |
| `defaultFontFamily` | Family for new text (falls back to `fonts[0]`). |
| `defaultFontSize` | Reference size — see the scaling note below. |
| `defaultColor` | Fill colour for new text. |
| `defaultFontWeight` | `"normal"` or `"bold"` for new text (a preset's own weight wins). |
| `defaultFontStyle` | `"normal"` or `"italic"` for new text. |
| `defaultTextAlign` | `"left"`, `"center"`, or `"right"` for new text. |
| `defaultLineHeight` | Line height for new text. |
| `defaultLetterSpacing` | Letter spacing (px) for new text. |
| `minFontSize` / `maxFontSize` | Bounds for the font-size input (defaults `1` / `500`). |
| `presetGroups` | Categorized rich presets; replaces the built-in catalog. |
| `additionalPresetGroups` | Categories appended to the built-ins; matching group ids merge their presets. |
| `presets` | Deprecated flat style list retained for compatibility. Prefer `presetGroups`. |

`config.colors` (a top-level option, sibling of `text`) sets the **swatch palette**
shown in every colour picker — text fill, shape fill, and background. Users can
still enter any custom hex; the palette is just the quick-pick row.

## Rich text presets

Each modern preset contains one or more `blocks`. Omit block geometry for a
centered, auto-sized style preset; provide all of `x`, `y`, `width`, and `height`
as page fractions for a composition preset.

```tsx
text: {
  defaultFontSize: 32,
  presetGroups: [{
    id: "brand",
    label: "Brand",
    presets: [{
      id: "highlight",
      label: "Highlight",
      preview: { kind: "text", sample: "Brand" },
      blocks: [{
        text: "Brand",
        fontSizeScale: 2,
        backgroundColor: "#fde68a",
        transform: "uppercase",
        runOverrides: [
          { start: 0, end: 1, style: { backgroundColor: null } },
          { start: 1, end: 3, style: { backgroundColor: "#86efac" } },
        ],
      }],
    }],
  }],
}
```

`runOverrides` use half-open UTF-16 offsets: `[start, end)`. Ranges must contain
at least one code unit, stay within `text`, use integer boundaries, and must not
split a surrogate pair; invalid ranges are skipped. Overlapping overrides are
applied in authored order, with later values winning per property. An omitted
property inherits the earlier/base value, while `null` explicitly clears it.

`transform` is the preferred casing field and takes precedence over deprecated
`textTransform`, both on blocks and run overrides. A solid `fill` clears an
inherited gradient unless that same update also supplies `fillGradient`.

## How `defaultFontSize` is applied

`defaultFontSize` is a **reference size at a 1080px canvas**, not a literal pixel
value. The size applied to a new block is scaled to the canvas and the chosen
preset:

```
appliedSize = round(defaultFontSize × preset.fontSizeScale × min(pageW, pageH) / 1080)
```

So `defaultFontSize: 32` on a 2160px-tall image with the Title preset
(`fontSizeScale: 3.75`) lands much larger than 32px — this keeps text proportionate
across image resolutions. Users can still fine-tune the exact px in the Text
Properties panel (bounded by `min/maxFontSize`).

Preset lengths such as letter spacing, stroke/shadow sizes, highlight padding
and radius, curve radius, and background-box dimensions are also authored in
1080-reference pixels and multiplied by `min(pageW, pageH) / 1080`. Block
geometry is normalized instead, using page fractions from `0` to `1`.

Load the matching web fonts yourself (e.g. via a `<link>` or `@font-face`) so the
names you list actually render.

**Verified by:** [tests/guides/configure-fonts.spec.tsx](../../tests/guides/configure-fonts.spec.tsx)
— adds a text block and asserts the font picker lists the configured fonts and
omits the defaults.
