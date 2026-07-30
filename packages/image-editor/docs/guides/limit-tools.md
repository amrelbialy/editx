# Limit the Tools

Show only a subset of the built-in tools by passing `config.tools`. The tool
sidebar renders the listed tools in order; everything else is hidden.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor src="/photo.jpg" config={{ tools: ["crop", "adjust"] }} />;
```

Valid tool ids: `crop`, `adjust`, `filter`, `text`, `shapes`, `image`.

**Verified by:** [tests/guides/limit-tools.spec.tsx](../../tests/guides/limit-tools.spec.tsx)
— asserts the Crop and Adjust buttons render while the Filters and Text buttons
are absent.
