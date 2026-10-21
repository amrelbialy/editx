import { Check } from "lucide-react";
import type React from "react";
import type { useExportPages } from "../../hooks/use-export-pages";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui";

interface ExportPageSelectorProps {
  selection: ReturnType<typeof useExportPages>;
  disabled: boolean;
}

export const ExportPageSelector: React.FC<ExportPageSelectorProps> = (props) => {
  const { selection, disabled } = props;

  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-fluid font-medium text-muted-foreground">
          {t("pages.exportTarget")}
        </span>
        <Select
          value={selection.mode}
          disabled={disabled}
          onValueChange={(value) => {
            if (value === "current" || value === "selected" || value === "all")
              selection.setMode(value);
          }}
        >
          <SelectTrigger aria-label={t("pages.exportTarget")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current">{t("pages.exportCurrent")}</SelectItem>
            <SelectItem value="selected">{t("pages.exportSelected")}</SelectItem>
            <SelectItem value="all">{t("pages.exportAll")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {selection.mode === "selected" && (
        <fieldset
          aria-label={t("pages.exportSelection")}
          className="flex max-h-48 min-w-0 flex-col gap-2 overflow-y-auto"
        >
          {selection.pages.map((page, index) => (
            <Button
              key={page.id}
              type="button"
              variant="outline"
              className="h-auto min-h-8 justify-between gap-2 px-2 text-left"
              aria-pressed={selection.selectedIds.includes(page.id)}
              disabled={disabled}
              onClick={() => selection.toggle(page.id)}
            >
              <span className="min-w-0 truncate">
                {t("pages.page")} {index + 1}
                {page.name ? `: ${page.name}` : ""}
                <span className="ml-1.5 text-muted-foreground">
                  {page.width} x {page.height}
                </span>
              </span>
              <Check
                className={cn(
                  "size-4 shrink-0",
                  !selection.selectedIds.includes(page.id) && "invisible",
                )}
              />
            </Button>
          ))}
        </fieldset>
      )}
      {selection.mode !== "current" && (
        <p className="text-sm text-muted-foreground">{t("pages.exportZipHint")}</p>
      )}
      {selection.mode === "selected" && selection.selectedIds.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          {t("pages.exportEmpty")}
        </p>
      )}
    </div>
  );
};
