import { ImageEditor } from "../../src/image-editor";

/**
 * Test story for the custom-tool recipe. Component functions (icon/panel) must
 * be defined in an importable module, not inline in the spec, so Playwright CT
 * can mount them.
 */

const StickersIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" />
);
const StickersPanel = () => <div data-testid="stickers-panel">Pick a sticker</div>;

export const CustomToolHarness = () => (
  <ImageEditor
    src="/fixtures/test-image-100x100.png"
    width="900px"
    height="600px"
    config={{
      customTools: [
        { id: "stickers", label: "Stickers", icon: StickersIcon, panel: StickersPanel },
      ],
    }}
  />
);
