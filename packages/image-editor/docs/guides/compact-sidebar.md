# Compact the Tool Sidebar

Switch the tool rail to a tight, icon-only column with
`config.ui.toolSidebar.compact`. Compact mode hides the text labels, narrows the
rail, and shrinks each button to a square — no more stranded icons in tall
buttons.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    ui: {
      toolSidebar: {
        compact: true,
        groupSeparators: false,
      },
    },
  }}
/>;
```

- `compact: true` collapses the rail to icon-only, tightly-spaced buttons.
  Buttons stay fully accessible — the tool name moves to the tooltip and
  `aria-label`.
- `groupSeparators: false` removes the dividers between tool groups.

`compact` defaults to `false` and `groupSeparators` to `true`. Omit
`toolSidebar` to keep the full labelled sidebar.

**Verified by:** [tests/guides/compact-sidebar.spec.tsx](../../tests/guides/compact-sidebar.spec.tsx)
— mounts with `compact: true` and asserts the visible label text is gone while
the tool buttons remain reachable by their accessible name.
