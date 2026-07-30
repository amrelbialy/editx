# Customize the Chrome

Control the editor's frame — the title and the close/back button — with
`config.ui`. Set a product-specific title, hide it, or swap the close **X** for a
back arrow when the editor lives inside a larger flow.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  onClose={() => history.back()}
  config={{
    ui: {
      title: "Photo Studio",
      showTitle: true,
      showCloseButton: true,
      showBackButton: true,
    },
  }}
/>;
```

- `title` — text shown in the topbar (defaults to the localized "Photo Editor").
- `showTitle` — hide the title entirely when `false`.
- `showCloseButton` — show the close control (defaults to `true` when `onClose` is provided).
- `showBackButton` — render a back arrow instead of the **X** (label becomes "Back").

**Verified by:** [tests/guides/customize-chrome.spec.tsx](../../tests/guides/customize-chrome.spec.tsx)
— asserts a custom title renders and that `showBackButton` swaps the close
control for a "Back" button.
