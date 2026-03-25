import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface DiscardConfirmationDialogProps {
  open: boolean;
  onDiscard: () => void;
  onCancel: () => void;
}

export const DiscardConfirmationDialog: React.FC<DiscardConfirmationDialogProps> = ({
  open,
  onDiscard,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialog.unsavedTitle")}</DialogTitle>
          <DialogDescription>{t("dialog.unsavedDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t("dialog.cancel")}
          </Button>
          <Button variant="destructive" onClick={onDiscard}>
            {t("dialog.discard")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
