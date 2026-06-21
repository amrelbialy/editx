# Recipe: Mount without React (any framework)

Use the framework-agnostic entry to mount the editor into a plain DOM element —
no React knowledge required in your app. Works with Vue, Svelte, Angular, or no
framework at all.

```ts
import { createImageEditor } from "@editx/image-editor/vanilla";
import "@editx/image-editor/styles.css";

const editor = createImageEditor("#editor", {
  src: "/photo.jpg",
  onSave: (blob) => upload(blob),
});

// Patch options later (shallow-merged over the current ones):
editor.update({ config: { tools: ["crop"] } });

// Tear down when done:
editor.destroy();
```

`createImageEditor(target, options)` accepts a DOM element or a CSS selector and
returns an instance with `update()` and `destroy()`. `options` has the same shape
as the React component props (`src`, `config`, `onSave`, `onClose`, …).

**Verified by:** [tests/recipes/vanilla-mount.spec.tsx](../../tests/recipes/vanilla-mount.spec.tsx)
— mounts via the vanilla API, patches options with `update()`, and tears down
with `destroy()`.
