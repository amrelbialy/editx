# Add a Watermark on Save

Transform the exported image before it reaches your `onSave` handler with
`events.onBeforeSave`. It receives the rendered `Blob` and returns a new one —
the perfect hook for stamping a watermark, re-encoding, or uploading a processed
copy.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  onSave={(blob) => uploadToServer(blob)}
  events={{
    onBeforeSave: async (blob) => {
      const watermarked = await stampWatermark(blob);
      return watermarked; // return undefined to keep the original
    },
  }}
/>;
```

`onBeforeSave` runs after the scene is rendered and before `onSave` (or the
built-in download). Return a `Blob` to replace the export, or `undefined` to keep
the original. It can be async, so you can await canvas work or a network round-trip.

**Verified by:** [tests/guides/watermark-on-save.spec.tsx](../../tests/guides/watermark-on-save.spec.tsx)
— exports the scene and asserts the blob passed to `onSave` is the one returned
by `onBeforeSave`.
