import {
  defineImageEditorElement,
  type EditxImageEditorElement,
} from "@editx/image-editor/element";
import { useEffect, useRef } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

defineImageEditorElement();

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

/**
 * Live demo for the web-component guide: registers and mounts the
 * `<editx-image-editor>` custom element using plain DOM APIs.
 */
export function GuideWebComponent() {
  const [dark] = useDarkMode();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = document.createElement("editx-image-editor") as EditxImageEditorElement;
    el.setAttribute("src", SAMPLE_IMAGE);
    el.setAttribute("width", "100%");
    el.setAttribute("height", "100%");
    el.style.height = "100%";
    el.config = {
      theme: { preset: dark ? "dark" : "light" },
      ui: { unsavedChangesWarning: false },
    };
    containerRef.current.appendChild(el);
    return () => el.remove();
  }, [dark]);

  return (
    <div
      className="not-prose my-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
      style={{ height: 520 }}
    >
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
