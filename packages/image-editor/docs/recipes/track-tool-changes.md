# Recipe: React to tool changes

Pass an `events` prop to be notified when the active tool changes. `onToolChange`
receives the tool id (e.g. `"adjust"`) or `null` when the user returns to the
default selection.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  events={{
    onToolChange: (toolId) => {
      console.log("active tool:", toolId);
    },
  }}
/>;
```

`events.onBeforeSave(blob)` is also available to transform the exported blob
before it reaches `onSave`.

**Verified by:** [tests/recipes/track-tool-changes.spec.tsx](../../tests/recipes/track-tool-changes.spec.tsx)
— selects the Adjust tool and asserts the callback fires with `"adjust"`.
