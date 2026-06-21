import { j as jsxRuntimeExports, T as ThemeProvider, D as Dialog, a as DialogContent, I as ImageEditor, c as cn } from './image-editor-r4KlYbP7.js';
import { r as reactExports } from './index-8Qc25cWx.js';

const ImageEditorModal = (props) => {
  const {
    open,
    onOpenChange,
    onClose,
    config,
    className,
    overlayClassName,
    width,
    height,
    ...editorProps
  } = props;
  const handleClose = reactExports.useCallback(
    (reason, hasUnsavedChanges) => {
      onClose?.(reason, hasUnsavedChanges);
      onOpenChange(false);
    },
    [onClose, onOpenChange]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ThemeProvider, { theme: config?.theme, children: /* @__PURE__ */ jsxRuntimeExports.jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxRuntimeExports.jsx(
    DialogContent,
    {
      className: cn("w-250 h-150 min-w-100 min-h-100 p-0", className),
      overlayClassName,
      hideClose: true,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        ImageEditor,
        {
          ...editorProps,
          config,
          onClose: handleClose,
          width: "100%",
          height: "100%"
        }
      )
    }
  ) }) });
};

const OpenInModalHarness = () => {
  const [open, setOpen] = reactExports.useState(false);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { type: "button", onClick: () => setOpen(true), children: "Edit image" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(ImageEditorModal, { open, onOpenChange: setOpen, src: "/fixtures/test-image-100x100.png" })
  ] });
};

export { OpenInModalHarness };
//# sourceMappingURL=open-in-modal.harness-CFRWugrl.js.map
