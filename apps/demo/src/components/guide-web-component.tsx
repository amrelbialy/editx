import type { EditxImageEditorElement } from "@editx/image-editor/element";
import { useEffect, useRef } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

/**
 * Live demo for the web-component guide: registers and mounts the
 * `<editx-image-editor>` custom element using plain DOM APIs.
 */
export function GuideWebComponent() {
  const [dark] = useDarkMode();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let element: EditxImageEditorElement | undefined;
    let cancelled = false;

    void import("@editx/image-editor/element").then(({ defineImageEditorElement }) => {
      if (cancelled || !containerRef.current) return;

      defineImageEditorElement();
      element = document.createElement("editx-image-editor") as EditxImageEditorElement;
      element.setAttribute("src", SAMPLE_IMAGE);
      element.setAttribute("width", "100%");
      element.setAttribute("height", "100%");
      element.style.height = "100%";
      element.config = {
        theme: { preset: dark ? "dark" : "light" },
        ui: { unsavedChangesWarning: false },
      };
      containerRef.current.appendChild(element);
    });

    return () => {
      cancelled = true;
      element?.remove();
    };
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
