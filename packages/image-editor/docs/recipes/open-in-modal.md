# Recipe: Open the editor in a modal

Use `<ImageEditorModal>` to present the editor in a controlled dialog. It accepts
every `ImageEditor` prop plus `open` and `onOpenChange`.

```tsx
import { useState } from "react";
import { ImageEditorModal } from "@editx/image-editor";

function Example() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Edit image
      </button>
      <ImageEditorModal
        open={open}
        onOpenChange={setOpen}
        src="/photo.jpg"
        onSave={(blob) => {
          /* upload blob */
        }}
      />
    </>
  );
}
```

The modal closes automatically after save (or set `config.export.closeAfterSave`),
and `onClose` is called with the close reason.

**Verified by:** [tests/recipes/open-in-modal.spec.tsx](../../tests/recipes/open-in-modal.spec.tsx)
— opens the modal and asserts the editor toolbar renders inside the dialog.
