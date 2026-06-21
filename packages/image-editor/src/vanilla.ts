import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ImageEditor, type ImageEditorProps } from "./image-editor";

/**
 * Options for {@link createImageEditor}. These mirror the React component props
 * exactly, so any framework can mount the editor without a React dependency of
 * its own.
 */
export type CreateImageEditorOptions = ImageEditorProps;

/** Handle returned by {@link createImageEditor} to control the mounted editor. */
export interface ImageEditorInstance {
  /** Re-render with patched options (shallow-merged over the current ones). */
  update(options: Partial<CreateImageEditorOptions>): void;
  /** Unmount the editor and release its DOM. Safe to call multiple times. */
  destroy(): void;
}

/**
 * Mount the image editor into a plain DOM element — framework-agnostic.
 *
 * ```ts
 * import { createImageEditor } from "@editx/image-editor/vanilla";
 * import "@editx/image-editor/styles.css";
 *
 * const editor = createImageEditor("#editor", {
 *   src: "/photo.jpg",
 *   onSave: (blob) => upload(blob),
 * });
 *
 * editor.update({ config: { tools: ["crop"] } });
 * editor.destroy();
 * ```
 *
 * @param target A DOM element or a CSS selector resolved against `document`.
 * @param options Editor options (same shape as the React component props).
 */
export function createImageEditor(
  target: HTMLElement | string,
  options: CreateImageEditorOptions,
): ImageEditorInstance {
  const element = typeof target === "string" ? document.querySelector(target) : target;

  if (!(element instanceof HTMLElement)) {
    throw new Error(
      `createImageEditor: target element not found${
        typeof target === "string" ? ` for selector "${target}"` : ""
      }.`,
    );
  }

  const root: Root = createRoot(element);
  let current = options;
  let destroyed = false;

  const render = () => {
    root.render(createElement(ImageEditor, current));
  };

  render();

  return {
    update(next) {
      if (destroyed) return;
      current = { ...current, ...next };
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.unmount();
    },
  };
}
