import type { EditxEngine } from "@editx/engine";
import { type FC, useState } from "react";
import type { PageNavigationLayout } from "../../config/ui-config.types";
import { usePageNavigation } from "../../hooks/use-page-navigation";
import { usePageScreenFrames } from "../../hooks/use-page-screen-frames";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { Button } from "../ui";

interface PageNavigationProps {
  engine: EditxEngine;
  layout?: PageNavigationLayout;
}

export const PageNavigation: FC<PageNavigationProps> = (props) => {
  const { engine, layout = "vertical" } = props;

  const { t } = useTranslation();
  const { pages, activePageId, selectedPageId, error, disabled, navigate } = usePageNavigation(
    engine,
    layout,
  );
  const frames = usePageScreenFrames(engine, pages);

  const [hoveredPageId, setHoveredPageId] = useState<number | null>(null);

  const hovered = disabled
    ? undefined
    : frames.find(({ id }) => id === hoveredPageId && id !== selectedPageId);

  return (
    <nav
      aria-label={t("pages.navigation")}
      className="pointer-events-none absolute inset-0 overflow-clip"
    >
      {error ? (
        <p role="alert" className="absolute left-3 top-3 p-3 text-sm text-destructive">
          {t("pages.unavailable")}: {error}
        </p>
      ) : (
        frames.map((frame) => {
          const index = pages.findIndex(({ id }) => id === frame.id);
          if (index === -1) return null;
          const name = pages[index].name;
          return (
            <Button
              key={frame.id}
              type="button"
              variant="ghost"
              className={cn(
                "pointer-events-auto absolute h-8 justify-start truncate px-2 text-muted-foreground",
                "group-has-[.konvajs-content:active]/canvas:pointer-events-none",
                selectedPageId === frame.id && "text-primary",
              )}
              style={{
                left: frame.x,
                top: frame.y - 36 * frame.scale,
                maxWidth: frame.width / frame.scale,
                // Keep captions readable without exceeding the fixed world-space page gap.
                fontSize: Math.min(28, 14 / frame.scale),
                lineHeight: 1,
                transform: `scale(${frame.scale})`,
                transformOrigin: "top left",
              }}
              aria-label={`${t("pages.selectPage")} ${index + 1}${name ? `: ${name}` : ""}`}
              aria-current={frame.id === activePageId ? "page" : undefined}
              aria-pressed={frame.id === selectedPageId}
              data-page-id={frame.id}
              disabled={disabled}
              onClick={() => navigate(frame.id)}
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) navigate(frame.id, true);
              }}
              onPointerEnter={() => setHoveredPageId(frame.id)}
              onPointerLeave={() => setHoveredPageId(null)}
            >
              {t("pages.page")} {index + 1}
            </Button>
          );
        })
      )}
      {hovered && (
        <div
          data-testid="page-title-hover-outline"
          className="absolute border-2 border-dashed border-primary"
          style={{ left: hovered.x, top: hovered.y, width: hovered.width, height: hovered.height }}
        />
      )}
    </nav>
  );
};
