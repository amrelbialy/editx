import { I as ImageEditor, j as jsxRuntimeExports } from './image-editor-Y5VSeXZP.js';
import { c as clientExports, r as reactExports } from './index-Drhe2rH0.js';

function createImageEditor(target, options) {
  const element = typeof target === "string" ? document.querySelector(target) : target;
  if (!(element instanceof HTMLElement)) {
    throw new Error(
      `createImageEditor: target element not found${typeof target === "string" ? ` for selector "${target}"` : ""}.`
    );
  }
  const root = clientExports.createRoot(element);
  let current = options;
  let destroyed = false;
  const render = () => {
    root.render(reactExports.createElement(ImageEditor, current));
  };
  render();
  return {
    update(next) {
      if (destroyed) return;
      current = { ...current, ...next };
      render();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      root.unmount();
    }
  };
}

const VanillaMountHarness = () => {
  const containerRef = reactExports.useRef(null);
  const instanceRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!containerRef.current) return;
    instanceRef.current = createImageEditor(containerRef.current, {
      src: "/fixtures/test-image-100x100.png",
      width: "900px",
      height: "600px"
    });
    return () => instanceRef.current?.destroy();
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: () => instanceRef.current?.update({ config: { tools: ["crop"] } }),
        children: "Limit tools"
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => instanceRef.current?.destroy(), children: "Destroy editor" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: containerRef, style: { width: 900, height: 600 } })
  ] });
};

export { VanillaMountHarness };
//# sourceMappingURL=vanilla-mount.harness-CmPwcKyc.js.map
