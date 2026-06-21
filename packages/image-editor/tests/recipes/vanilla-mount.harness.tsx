import { useEffect, useRef } from "react";
import { createImageEditor, type ImageEditorInstance } from "../../src/vanilla";

/**
 * Test story for the vanilla-mount recipe. The framework-agnostic
 * `createImageEditor` is driven inside a React effect against a plain container
 * div, and exposes update/destroy via buttons so Playwright CT can exercise the
 * full lifecycle.
 */
export const VanillaMountHarness = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<ImageEditorInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = createImageEditor(containerRef.current, {
      src: "/fixtures/test-image-100x100.png",
      width: "900px",
      height: "600px",
    });
    return () => instanceRef.current?.destroy();
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={() => instanceRef.current?.update({ config: { tools: ["crop"] } })}
      >
        Limit tools
      </button>
      <button type="button" onClick={() => instanceRef.current?.destroy()}>
        Destroy editor
      </button>
      <div ref={containerRef} style={{ width: 900, height: 600 }} />
    </div>
  );
};
