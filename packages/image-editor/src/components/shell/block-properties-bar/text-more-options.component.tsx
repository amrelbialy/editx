import { MoreHorizontal, RemoveFormatting, Strikethrough, Underline } from "lucide-react";
import type React from "react";
import { useTranslation } from "../../../i18n/i18n-context";
import { cn } from "../../../utils/cn";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui";

export interface TextMoreOptionsProps {
  textDecoration: string;
  onUnderlineToggle: () => void;
  onStrikethroughToggle: () => void;
  onClearFormatting: () => void;
}

/**
 * The "more text options" (…) dropdown: underline, strikethrough and clear
 * formatting. Split out of the toolbar to keep each file focused.
 */
export const TextMoreOptions: React.FC<TextMoreOptionsProps> = (props) => {
  const { textDecoration, onUnderlineToggle, onStrikethroughToggle, onClearFormatting } = props;

  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground"
              aria-label={t("block.moreTextOptions")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("block.moreTextOptions")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="w-auto p-1" align="start" data-text-toolbar>
        <div className="flex flex-col gap-0.5 min-w-[160px]">
          <Button
            variant="ghost"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onUnderlineToggle}
            className={cn(
              "w-full justify-start gap-2",
              textDecoration.includes("underline")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            <Underline className="h-4 w-4" />
            {t("block.underline")}
          </Button>
          <Button
            variant="ghost"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onStrikethroughToggle}
            className={cn(
              "w-full justify-start gap-2",
              textDecoration.includes("line-through")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground",
            )}
          >
            <Strikethrough className="h-4 w-4" />
            {t("block.strikethrough")}
          </Button>
          <div className="h-px bg-border my-0.5" />
          <Button
            variant="ghost"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClearFormatting}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <RemoveFormatting className="h-4 w-4" />
            {t("block.clearFormatting")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
