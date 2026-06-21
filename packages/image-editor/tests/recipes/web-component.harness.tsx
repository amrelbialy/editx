import { useEffect, useRef } from "react";
import { defineImageEditorElement, type EditxImageEditorElement } from "../../src/element";

defineImageEditorElement();

/**
 * Test story for the web-component recipe. Registers the `<editx-image-editor>`
 * custom element and drives it through plain DOM APIs (attributes + property
 * setters), so Playwright CT can exercise the element lifecycle the same way a
 * non-React consumer would.
 */
export const WebComponentHarness = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<EditxImageEditorElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = document.createElement("editx-image-editor") as EditxImageEditorElement;
    el.setAttribute("src", "/fixtures/test-image-100x100.png");
    el.setAttribute("width", "900px");
    el.setAttribute("height", "600px");
    containerRef.current.appendChild(el);
    elementRef.current = el;
    return () => el.remove();
  }, []);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          if (elementRef.current) elementRef.current.config = { tools: ["crop"] };
        }}
      >
        Limit tools
      </button>
      <button type="button" onClick={() => elementRef.current?.remove()}>
        Remove element
      </button>
      <div ref={containerRef} style={{ width: 900, height: 600 }} />
    </div>
  );
};
