# React to Editor Events

The editor exposes lifecycle hooks in two places: the `events` prop for in-editor
activity, and the top-level `onSave` / `onClose` props for the exit points.

| Hook | Where | Fires when |
|---|---|---|
| `events.onToolChange` | `events` | Active tool changes — receives the tool id or `null` |
| `events.onBeforeSave` | `events` | Before a save — return a `Blob` to replace the export |
| `onSave` | prop | An export completes — receives the final `Blob` |
| `onClose` | prop | Editor is dismissed — receives `reason` + `hasUnsavedChanges` |

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  onSave={(blob) => uploadToServer(blob)}
  onClose={(reason, hasUnsavedChanges) => console.log(reason, hasUnsavedChanges)}
  events={{
    onToolChange: (toolId) => console.log("active tool:", toolId),
    onBeforeSave: (blob) => undefined,
  }}
/>;
```

**Verified by:** [tests/guides/track-tool-changes.spec.tsx](../../tests/guides/track-tool-changes.spec.tsx)
— selects the Adjust tool and asserts the callback fires with `"adjust"`.