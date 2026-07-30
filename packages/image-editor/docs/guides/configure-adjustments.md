# Configure the Adjust Tool

Choose exactly which sliders the **Adjust** tool exposes with
`config.adjust.controls`. Pass the ordered list of controls you want and the
panel renders only those — everything else is hidden.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    adjust: {
      controls: ["brightness", "contrast", "saturation"],
    },
  }}
/>;
```

Available controls: `brightness`, `saturation`, `contrast`, `gamma`, `clarity`,
`exposure`, `shadows`, `highlights`, `blacks`, `whites`, `temperature`,
`sharpness`. The tool keeps its **Basic** / **Refinements** grouping — a group
disappears entirely when none of its controls are whitelisted. Omit `controls`
to show the full set.

**Verified by:** [tests/guides/configure-adjustments.spec.tsx](../../tests/guides/configure-adjustments.spec.tsx)
— opens the Adjust tool and asserts only the whitelisted sliders render.
