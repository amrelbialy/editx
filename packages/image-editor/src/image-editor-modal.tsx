import * as DialogPrimitive from "@radix-ui/react-dialog";
import type React from "react";
import { useCallback } from "react";
import { Dialog, DialogOverlay } from "./components/ui/dialog";
import type { CloseReason } from "./config/config.types";
import { ImageEditor, type ImageEditorProps } from "./image-editor";
import { ThemeProvider } from "./theme/theme-provider";

export interface ImageEditorModalProps extends ImageEditorProps {
  /** Controls whether the modal is open. */
  open: boolean;
  /** Called when the modal open state should change (e.g. backdrop click, escape). */
  onOpenChange: (open: boolean) => void;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = (props) => {
  const { open, onOpenChange, onClose, config, ...editorProps } = props;

  const handleClose = useCallback(
    (reason?: CloseReason, hasUnsavedChanges?: boolean) => {
      onClose?.(reason, hasUnsavedChanges);
      onOpenChange(false);
    },
    [onClose, onOpenChange],
  );

  return (
    <ThemeProvider theme={config?.theme}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogOverlay className="fixed inset-0 bg-black/80" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 outline-none"
            aria-label="Image editor"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
          >
            <ImageEditor
              {...editorProps}
              config={config}
              onClose={handleClose}
              width="100%"
              height="100%"
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    </ThemeProvider>
  );
};
