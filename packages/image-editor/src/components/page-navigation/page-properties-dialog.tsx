import type { PageProperties, PagePropertiesUpdate } from "@editx/engine";
import { type FC, useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle, Input } from "../ui";

interface PagePropertiesDialogProps {
  properties: PageProperties;
  disabled: boolean;
  onSave: (update: PagePropertiesUpdate) => void;
  onClose: () => void;
}

export const PagePropertiesDialog: FC<PagePropertiesDialogProps> = (props) => {
  const { properties, disabled, onSave, onClose } = props;

  const { t } = useTranslation();

  const [name, setName] = useState(properties.name);
  const [width, setWidth] = useState(String(properties.width));
  const [height, setHeight] = useState(String(properties.height));

  return (
    <Dialog open modal onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideClose
        className="pointer-events-auto max-w-sm gap-3 p-3"
        overlayClassName="pointer-events-auto"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const content = event.currentTarget;
          if (content instanceof HTMLElement) content.querySelector("input")?.focus();
        }}
      >
        <DialogTitle>{t("pages.properties")}</DialogTitle>
        <DialogDescription>{t("pages.resizeHint")}</DialogDescription>
        <form
          className="flex min-w-0 flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ name, width: Number(width), height: Number(height) });
          }}
        >
          <Input
            type="text"
            label={t("pages.name")}
            aria-label={t("pages.name")}
            labelClassName="w-12"
            value={name}
            disabled={disabled}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            type="number"
            label={t("pages.width")}
            aria-label={t("pages.width")}
            labelClassName="w-12"
            suffix="px"
            required
            min={0}
            step="any"
            value={width}
            disabled={disabled}
            onChange={(event) => setWidth(event.target.value)}
          />
          <Input
            type="number"
            label={t("pages.height")}
            aria-label={t("pages.height")}
            labelClassName="w-12"
            suffix="px"
            required
            min={0}
            step="any"
            value={height}
            disabled={disabled}
            onChange={(event) => setHeight(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("dialog.cancel")}
            </Button>
            <Button type="submit" disabled={disabled}>
              {t("pages.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
