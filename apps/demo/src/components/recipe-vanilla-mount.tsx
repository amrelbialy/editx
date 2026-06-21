import { createImageEditor } from "@editx/image-editor/vanilla";
import { useEffect, useRef } from "react";
import { useDarkMode } from "../hooks/use-dark-mode";

const SAMPLE_IMAGE = "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=2000&q=90";

/**
 * Live demo for the vanilla-mount recipe: mounts the editor with the
 * framework-agnostic `createImageEditor` API against a plain container div.
 */
export function RecipeVanillaMount() {
  const [dark] = useDarkMode();

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = createImageEditor(containerRef.current, {
      src: SAMPLE_IMAGE,
      width: "100%",
      height: "100%",
      config: {
        theme: { preset: dark ? "dark" : "light" },
        ui: { unsavedChangesWarning: false },
      },
    });
    return () => editor.destroy();
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
