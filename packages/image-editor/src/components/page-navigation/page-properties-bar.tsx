import { type Color, colorToHex } from "@editx/engine";
import { Scaling } from "lucide-react";
import { type FC, useState } from "react";
import { useTranslation } from "../../i18n/i18n-context";
import { Button, ColorSwatch, Popover, PopoverContent, PopoverTrigger, Separator } from "../ui";

interface PagePropertiesBarProps {
  backgroundColor: Color;
  disabled: boolean;
  onResize: () => void;
  onBackground: (color: string) => boolean;
}

export const PagePropertiesBar: FC<PagePropertiesBarProps> = (props) => {
  const { backgroundColor, disabled, onResize, onBackground } = props;

  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [color, setColor] = useState(() => colorToHex({ ...backgroundColor, a: 1 }));

  return (
    <div
      role="toolbar"
      aria-label={t("pages.propertyBar")}
      className="pointer-events-auto flex h-10 items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-card/95 px-3 shadow-lg backdrop-blur-sm"
    >
      <Button
        type="button"
        variant="ghost"
        className="h-8 px-2"
        disabled={disabled}
        onClick={onResize}
      >
        <Scaling className="size-4" />
        {t("pages.resize")}
      </Button>
      <Separator orientation="vertical" className="mx-1 h-4" />
      <Popover
        open={open && !disabled}
        onOpenChange={(next) => {
          if (next) setColor(colorToHex({ ...backgroundColor, a: 1 }));
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="h-8 gap-1.5 px-2"
            aria-label={t("pages.background")}
            disabled={disabled}
          >
            <span
              className="size-4 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: colorToHex(backgroundColor) }}
            />
            {t("block.color")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="pointer-events-auto flex w-auto items-center gap-2 p-3">
          <ColorSwatch
            value={color}
            aria-label={t("pages.backgroundValue")}
            onChange={(event) => setColor(event.target.value)}
          />
          <Button
            type="button"
            className="h-8 px-2"
            onClick={() => {
              if (onBackground(color)) setOpen(false);
            }}
          >
            {t("pages.applyColor")}
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
};
