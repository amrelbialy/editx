# Save & Close

Dismiss the editor automatically once an export succeeds. Set
`config.export.closeAfterSave` and provide an `onClose` handler — after the blob
is saved, the editor calls `onClose("save")` so you can tear down the modal or
navigate away.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  onSave={(blob) => uploadToServer(blob)}
  onClose={(reason) => {
    if (reason === "save") closeModal();
  }}
  config={{ export: { closeAfterSave: true } }}
/>;
```

`onClose` receives a `reason` (`"save"`, `"close-button"`, `"back-button"`, or
`"escape"`) and a `hasUnsavedChanges` flag. When the editor closes after a
successful export the reason is `"save"` and there are no unsaved changes.

**Verified by:** [tests/guides/save-and-close.spec.tsx](../../tests/guides/save-and-close.spec.tsx)
— exports the scene with `closeAfterSave` enabled and asserts `onClose` is called
with the `"save"` reason.
