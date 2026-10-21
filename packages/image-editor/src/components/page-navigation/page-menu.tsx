import { MoreHorizontal } from "lucide-react";
import { type FC, useRef, useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
} from "../ui";

interface PageMenuProps {
  label: string;
  disabled: boolean;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (offset: number) => void;
}

export const PageMenu: FC<PageMenuProps> = (props) => {
  const { label, disabled, first, last, onEdit, onDelete, onMove } = props;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(false);

  const { t } = useTranslation();

  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open && !disabled} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <IconButton
          ref={triggerRef}
          type="button"
          label={`${t("pages.actions")}: ${label}`}
          icon={<MoreHorizontal className="size-4" />}
          disabled={disabled}
          className="h-8 w-8"
          onFocus={(event) => {
            // Restoring menu focus must not reopen a tooltip over the page title.
            if (restoreFocusRef.current) event.preventDefault();
          }}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="pointer-events-auto"
        align="end"
        onEscapeKeyDown={() => {
          restoreFocusRef.current = true;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          if (restoreFocusRef.current) triggerRef.current?.focus({ preventScroll: true });
          restoreFocusRef.current = false;
        }}
      >
        <DropdownMenuItem onSelect={onEdit}>{t("pages.rename")}</DropdownMenuItem>
        <DropdownMenuItem disabled={first} onSelect={() => onMove(-1)}>
          {t("pages.moveEarlier")}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={last} onSelect={() => onMove(1)}>
          {t("pages.moveLater")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onSelect={onDelete}>
          {t("pages.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
