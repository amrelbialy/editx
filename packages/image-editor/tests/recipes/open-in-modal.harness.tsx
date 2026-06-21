import { useState } from "react";
import { ImageEditorModal } from "../../src/image-editor-modal";

/**
 * Test story for the open-in-modal recipe. Keeps the controlled `open` state and
 * the `onOpenChange` handler in an importable module so Playwright CT can mount
 * it and drive the dialog.
 */
export const OpenInModalHarness = () => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Edit image
      </button>
      <ImageEditorModal open={open} onOpenChange={setOpen} src="/fixtures/test-image-100x100.png" />
    </div>
  );
};
