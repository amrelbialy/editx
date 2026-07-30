# Limit Image Uploads

Guard the **Image** tool against oversized or huge uploads with `config.image`.
Cap the file size and the maximum dimension so users can't drop in a 50 MP photo.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    image: {
      maxFileSize: 5 * 1024 * 1024, // 5 MB
      maxDimension: 4096, // px, longest edge
    },
  }}
/>;
```

- `maxFileSize` (bytes) rejects files larger than the limit with an inline error.
- `maxDimension` (px) downscales images whose longest edge exceeds the limit.

Omit `image` to use the built-in defaults.

**Verified by:** [tests/guides/image-upload-limits.spec.tsx](../../tests/guides/image-upload-limits.spec.tsx)
— mounts with a 1 MB cap, uploads an oversized file, and asserts the size-limit
error appears.
