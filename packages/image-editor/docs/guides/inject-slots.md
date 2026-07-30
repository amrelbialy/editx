# Inject Custom UI

Render your own React nodes into named regions of the editor shell with the
`slots` prop. Three slots are available:

- `topbarRight` — right side of the topbar, before the Export button.
- `sidebarBottom` — bottom of the tool sidebar (desktop only).
- `contextualBarExtra` — the contextual bar below the canvas, when a tool is active.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  slots={{ topbarRight: <button type="button">Share</button> }}
/>;
```

**Verified by:** [tests/guides/inject-slots.spec.tsx](../../tests/guides/inject-slots.spec.tsx)
— asserts the injected node renders in the topbar.
