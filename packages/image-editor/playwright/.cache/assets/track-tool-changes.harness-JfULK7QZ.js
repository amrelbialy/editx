import { j as jsxRuntimeExports, I as ImageEditor } from './image-editor-r4KlYbP7.js';
import { r as reactExports } from './index-8Qc25cWx.js';

const TrackToolChangesHarness = () => {
  const [lastTool, setLastTool] = reactExports.useState("none");
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ImageEditor,
      {
        src: "/fixtures/test-image-100x100.png",
        width: "900px",
        height: "600px",
        events: { onToolChange: (toolId) => setLastTool(toolId ?? "none") }
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-testid": "last-tool", children: lastTool })
  ] });
};

export { TrackToolChangesHarness };
//# sourceMappingURL=track-tool-changes.harness-JfULK7QZ.js.map
