import type { EditxEngine } from "@editx/engine";
import { Plus } from "lucide-react";
import { type FC, useState } from "react";
import type { PageNavigationLayout } from "../../config/ui-config.types";
import { usePageManagement } from "../../hooks/use-page-management";
import { usePageNavigation } from "../../hooks/use-page-navigation";
import { usePageScreenFrames } from "../../hooks/use-page-screen-frames";
import { useTranslation } from "../../i18n/i18n-context";
import { cn } from "../../utils/cn";
import { Button } from "../ui";
import { PageControls } from "./page-controls";
import { PagePropertiesDialog } from "./page-properties-dialog";

interface PageNavigationProps {
  engine: EditxEngine;
  layout?: PageNavigationLayout;
}

export const PageNavigation: FC<PageNavigationProps> = (props) => {
  const { engine, layout = "vertical" } = props;

  const { t } = useTranslation();
  const { pages, activePageId, selectedPageId, error, editing, disabled, navigate } =
    usePageNavigation(engine, layout);
  const frames = usePageScreenFrames(engine, pages);
  const management = usePageManagement(engine, disabled);

  const [hoveredPageId, setHoveredPageId] = useState<number | null>(null);

  const hovered = disabled
    ? undefined
    : frames.find(({ id }) => id === hoveredPageId && id !== selectedPageId);
  const draft = management.draft;
  const selectedPage = pages.find(({ id }) => id === selectedPageId);
  const selectedFrame = frames.find(({ id }) => id === selectedPageId);
  const actionRight = selectedFrame
    ? `clamp(104px, ${selectedFrame.x + Math.max(selectedFrame.width, 208)}px, calc(100% - 8px))`
    : "0px";

  return (
    <nav aria-label={t("pages.navigation")} className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 overflow-clip">
        {error ? (
          <p role="alert" className="absolute left-3 top-3 p-3 text-sm text-destructive">
            {t("pages.unavailable")}: {error}
          </p>
        ) : (
          frames.map((frame) => {
            const index = pages.findIndex(({ id }) => id === frame.id);
            if (index === -1) return null;
            const name = pages[index].name;
            const selected = selectedPageId === frame.id;
            const inset = frame.titleY >= frame.y;
            const titleY = inset ? frame.y + 4 : frame.titleY;
            return (
              <div
                key={frame.id}
                className={cn(
                  "pointer-events-none absolute h-6 text-muted-foreground [&_button]:pointer-events-auto",
                  "group-has-[.konvajs-content:active]/canvas:[&_button]:pointer-events-none",
                  selectedPageId === frame.id && "text-primary",
                )}
                style={{
                  left: frame.x,
                  top: titleY,
                  width: frame.width,
                  maxWidth:
                    selected && !inset
                      ? `max(0px, calc(${actionRight} - ${frame.x}px - 104px))`
                      : undefined,
                }}
                onPointerEnter={() => setHoveredPageId(frame.id)}
                onPointerLeave={() => setHoveredPageId(null)}
              >
                <div
                  className="pointer-events-none absolute border border-border/60 shadow-sm"
                  style={{ top: frame.y - titleY, width: frame.width, height: frame.height }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "relative h-6 justify-start truncate px-1.5 align-top text-inherit",
                    inset && "bg-card/95 shadow-sm",
                  )}
                  style={{
                    maxWidth: "100%",
                    height: 24,
                    fontSize: 12,
                    lineHeight: "16px",
                  }}
                  data-page-title-placement={inset ? "inset" : "above"}
                  aria-label={`${t("pages.selectPage")} ${index + 1}${name ? `: ${name}` : ""}`}
                  aria-current={frame.id === activePageId ? "page" : undefined}
                  aria-pressed={frame.id === selectedPageId}
                  data-page-id={frame.id}
                  disabled={disabled}
                  onClick={() => navigate(frame.id)}
                  onDoubleClick={() => management.edit(frame.id)}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) navigate(frame.id, true);
                  }}
                >
                  {t("pages.page")} {index + 1}
                  {name ? `: ${name}` : ""}
                </Button>
              </div>
            );
          })
        )}
        {hovered && (
          <div
            data-testid="page-title-hover-outline"
            className="absolute border-2 border-dashed border-primary"
            style={{
              left: hovered.x,
              top: hovered.y,
              width: hovered.width,
              height: hovered.height,
            }}
          />
        )}
      </div>
      {selectedPage && selectedFrame && !editing && !error && (
        <PageControls
          key={`controls-${selectedPage.id}`}
          page={selectedPage}
          frame={selectedFrame}
          actionRight={actionRight}
          index={pages.findIndex(({ id }) => id === selectedPage.id)}
          count={pages.length}
          disabled={disabled}
          management={management}
        />
      )}
      <Button
        type="button"
        variant="outline"
        className="pointer-events-auto absolute left-1/2 top-full z-10 mt-3 h-8 -translate-x-1/2 gap-1.5 bg-card px-2 group-has-[.konvajs-content:active]/canvas:pointer-events-none"
        disabled={disabled}
        onClick={management.add}
      >
        <Plus className="size-4" />
        {t("pages.add")}
      </Button>
      {draft && (
        <PagePropertiesDialog
          key={`properties-${draft.id}`}
          properties={draft.properties}
          disabled={disabled}
          onSave={(update) => management.save(draft.id, update)}
          onClose={management.close}
        />
      )}
    </nav>
  );
};
