# Recipe: Embed as an HTML Web Component

Register `<editx-image-editor>` once and drop it into any HTML — no framework, no
build step. Works in plain HTML, a CMS, or inside Vue/Svelte/Angular templates.

```ts
import { defineImageEditorElement } from "@editx/image-editor/element";
import "@editx/image-editor/styles.css";

defineImageEditorElement(); // registers <editx-image-editor>
```

```html
<editx-image-editor src="/photo.jpg" width="900px" height="600px"></editx-image-editor>
```

Simple inputs are attributes (`src`, `width`, `height`). Complex inputs are JS
properties, and save/close are dispatched as DOM events:

```js
const el = document.querySelector("editx-image-editor");
el.config = { tools: ["crop", "adjust"] };
el.addEventListener("save", (e) => upload(e.detail.blob));
el.addEventListener("close", (e) => console.log(e.detail.reason));
```

The element uses **light DOM** (not Shadow DOM) so Radix portals and global
Tailwind styles keep working. It mounts on connect and tears down automatically
when removed from the DOM.

**Verified by:** [tests/recipes/web-component.spec.tsx](../../tests/recipes/web-component.spec.tsx)
— registers the element, mounts it from plain DOM, patches the `config` property,
and confirms removal tears the editor down.
