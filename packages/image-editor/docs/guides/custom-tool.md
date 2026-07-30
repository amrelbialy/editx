# Add a Custom Tool

Add your own tool to the sidebar with `config.customTools`. Each tool needs an
`id`, a `label`, an `icon` component, and an optional `panel` component that is
rendered when the tool is active.

```tsx
import { ImageEditor } from "@editx/image-editor";

const StickersIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" />
);
const StickersPanel = () => <div>Pick a sticker</div>;

<ImageEditor
  src="/photo.jpg"
  config={{
    customTools: [
      { id: "stickers", label: "Stickers", icon: StickersIcon, panel: StickersPanel },
    ],
  }}
/>;
```

Panel and contextual-bar components receive no props — read editor state through
the exported hooks (`useConfig`, `useImageEditorStore`).

**Verified by:** [tests/guides/custom-tool.spec.tsx](../../tests/guides/custom-tool.spec.tsx)
— asserts the custom tool button appears and its panel renders when selected.
