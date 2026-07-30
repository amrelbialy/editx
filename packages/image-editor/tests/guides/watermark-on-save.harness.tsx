import { useRef, useState } from "react";
import { ImageEditor } from "../../src/image-editor";

/**
 * Test story for the watermark-on-save guide. The blob must be inspected inside
 * the browser (Playwright CT strips Blob methods when proxying callback args to
 * the test), so onBeforeSave/onSave run here and the result is rendered to the
 * DOM for the spec to assert on.
 */

export const WatermarkOnSaveHarness = () => {
  const sentinel = useRef(new Blob(["WATERMARKED"], { type: "text/plain" }));
  const [saved, setSaved] = useState<string>("");

  return (
    <div>
      <div data-testid="save-result">{saved}</div>
      <ImageEditor
        src="/fixtures/test-image-100x100.png"
        width="900px"
        height="600px"
        onSave={(blob) => {
          // Same reference => onBeforeSave's return replaced the export.
          setSaved(blob === sentinel.current ? "watermarked" : "original");
        }}
        events={{
          onBeforeSave: () => sentinel.current,
        }}
      />
    </div>
  );
};
