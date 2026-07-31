# Save & Restore Scenes

Serialize the full editing state — every block, its transforms, and the active
page — to a JSON string, then restore it later. Grab the imperative editor handle
from the `onReady` prop.

```tsx
import { useRef } from "react";
import { ImageEditor, type EditorHandle } from "@editx/image-editor";

function Editor() {
  const handle = useRef<EditorHandle | null>(null);

  return (
    <>
      <ImageEditor src="/photo.jpg" onReady={(h) => (handle.current = h)} />
      <button onClick={() => localStorage.setItem("scene", handle.current!.saveScene())}>
        Save
      </button>
      <button onClick={() => handle.current!.loadScene(localStorage.getItem("scene")!)}>
        Restore
      </button>
    </>
  );
}
```

`onReady` fires once when the engine is ready and hands you an `EditorHandle`:

- `saveScene()` returns a JSON string of the entire scene.
- `loadScene(json)` restores a scene previously produced by `saveScene()`.
- `engine` is the underlying engine instance for advanced/headless use.

Saving only captures a snapshot; it does not change the canvas. To demonstrate
the round-trip, save a composition containing an image, shapes, and text, apply
a visibly different layout, then load the saved JSON to restore the original.

**Verified by:** [tests/guides/save-load-scene.spec.tsx](../../tests/guides/save-load-scene.spec.tsx)
— captures the handle, saves the scene, mutates it, then restores and asserts the
round-trip succeeds.
