import type React from "react";
import { useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogTitle } from "./components/ui/dialog";
import type { CloseReason } from "./config/config.types";
import { ImageEditor, type ImageEditorProps } from "./image-editor";
import { ThemeProvider } from "./theme/theme-provider";
import { cn } from "./utils/cn";

export interface ImageEditorModalProps extends ImageEditorProps {
  /** Controls whether the modal is open. */
  open: boolean;
  /** Called when the modal open state should change (e.g. backdrop click, escape). */
  onOpenChange: (open: boolean) => void;
  /** Additional className for the dialog content wrapper. */
  className?: string;
  /** Additional className for the overlay. */
  overlayClassName?: string;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = (props) => {
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
        <DialogContent
          className={cn("w-250 h-150 min-w-100 min-h-100 p-0", className)}
          overlayClassName={overlayClassName}
          hideClose
        >
          {/* <DialogTitle className="sr-only">Image editor</DialogTitle> */}
          <ImageEditor
            {...editorProps}
            config={config}
            onClose={handleClose}
            width="100%"
            height="100%"
          />
        </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
};
