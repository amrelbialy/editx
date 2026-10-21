import type { PageProperties } from "@editx/engine";
import { Copy } from "lucide-react";
import type { FC } from "react";
import type { usePageManagement } from "../../hooks/use-page-management";
import type { PageScreenFrame } from "../../hooks/use-page-screen-frames";
import { useTranslation } from "../../i18n/i18n-context";
import { IconButton, Separator } from "../ui";
import { PageMenu } from "./page-menu";
import { PagePropertiesBar } from "./page-properties-bar";

interface PageControlsProps {
  page: PageProperties & { id: number };
  frame: PageScreenFrame;
  actionRight: string;
  index: number;
  count: number;
  disabled: boolean;
  management: ReturnType<typeof usePageManagement>;
}

export const PageControls: FC<PageControlsProps> = (props) => {
  const { page, frame, actionRight, index, count, disabled, management } = props;

  const { t } = useTranslation();

  return (
    <>
      <div className="absolute left-1/2 -top-14 z-10 max-w-[calc(100%-1rem)] -translate-x-1/2">
        <PagePropertiesBar
          backgroundColor={page.backgroundColor}
          disabled={disabled}
          onResize={() => management.edit(page.id)}
          onBackground={(color) => management.setBackground(page.id, color)}
        />
      </div>
      <div
        className="absolute z-10 -translate-x-full -translate-y-full pointer-events-none"
        style={{
          left: actionRight,
          top: Math.max(24, frame.y),
        }}
      >
        <div
          role="toolbar"
          aria-label={t("pages.actionBar")}
          className="pointer-events-auto inline-flex h-9 items-center gap-1.5 rounded-2xl border border-border bg-card/95 px-1.5 shadow-lg backdrop-blur-sm group-has-[.konvajs-content:active]/canvas:pointer-events-none"
        >
          <IconButton
            type="button"
            label={t("pages.duplicate")}
            icon={<Copy className="size-4" />}
            disabled={disabled}
            onClick={() => management.duplicate(page.id)}
          />
          <Separator orientation="vertical" className="h-4" />
          <PageMenu
            label={`${t("pages.page")} ${index + 1}${page.name ? `: ${page.name}` : ""}`}
            disabled={disabled}
            first={index === 0}
            last={index === count - 1}
            onEdit={() => management.edit(page.id)}
            onDelete={() => management.remove(page.id)}
            onMove={(offset) => management.move(page.id, offset)}
          />
        </div>
      </div>
    </>
  );
};
