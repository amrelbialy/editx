# Set the Default Tool

Open the editor directly on a specific tool with `config.defaultTool`. Instead of
landing on the neutral selection state, the editor activates the tool you name as
soon as the image loads.

```tsx
import { ImageEditor } from "@editx/image-editor";

<ImageEditor
  src="/photo.jpg"
  config={{
    defaultTool: "adjust",
  }}
/>;
```

`defaultTool` accepts any tool id: `crop`, `adjust`, `filter`, `text`, `shapes`,
`image`. Set it to `null` (the default) to start on the neutral selection state.

**Verified by:** [tests/guides/set-default-tool.spec.tsx](../../tests/guides/set-default-tool.spec.tsx)
— mounts with `defaultTool: "adjust"` and asserts the Adjust panel is open without
any click.
