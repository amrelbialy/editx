import { j as jsxRuntimeExports, I as ImageEditor } from './image-editor-Y5VSeXZP.js';
import './index-Drhe2rH0.js';

const StickersIcon = ({ className }) => /* @__PURE__ */ jsxRuntimeExports.jsx("svg", { className, viewBox: "0 0 24 24", "aria-hidden": "true" });
const StickersPanel = () => /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "stickers-panel", children: "Pick a sticker" });
const CustomToolHarness = () => /* @__PURE__ */ jsxRuntimeExports.jsx(
  ImageEditor,
  {
    src: "/fixtures/test-image-100x100.png",
    width: "900px",
    height: "600px",
    config: {
      customTools: [
        { id: "stickers", label: "Stickers", icon: StickersIcon, panel: StickersPanel }
      ]
    }
  }
);

export { CustomToolHarness };
//# sourceMappingURL=custom-tool.harness-C2bXJ5av.js.map
