import type React from "react";
import type { ShapePreset, TextPreset } from "../../../config/config.types";
import { useTranslation } from "../../../i18n/i18n-context";
import { Button, CarouselRow, PresetCard } from "../../ui";
import { PresetRasterThumbnail } from "./preset-raster-thumbnail.component";

/** Minimal shape the gallery needs from a text or shape preset. */
export interface GalleryPreset {
  id: string;
  label: string;
  shape?: ShapePreset["shape"];
  fill?: ShapePreset["fill"];
  stroke?: ShapePreset["stroke"];
  blocks?: TextPreset["blocks"];
  group?: TextPreset["group"];
  composition?: TextPreset["composition"];
}

interface PresetCategoryRowProps {
  label: string;
  presets: GalleryPreset[];
  expanded: boolean;
  onToggleExpand: () => void;
  onSelect: (id: string) => void;
}

/** How many tiles a collapsed row shows before "More (N)". */
export const VISIBLE_COUNT = 3;

/**
 * One gallery category: a header with a "More (N)" / "Less" toggle, a collapsed
 * horizontal carousel (VISIBLE_COUNT cap), and an expanded container-query grid.
 * Ports the expand/collapse idiom from `resize-presets.tsx`.
 */
export const PresetCategoryRow: React.FC<PresetCategoryRowProps> = (props) => {
  const { label, presets, expanded, onToggleExpand, onSelect } = props;

  const { t } = useTranslation();

  const hasMore = presets.length > VISIBLE_COUNT;
  const visible = expanded ? presets : presets.slice(0, VISIBLE_COUNT);

  const cards = visible.map((preset) => (
    <PresetCard
      key={preset.id}
      ariaLabel={preset.label}
      label={preset.label}
      onClick={() => onSelect(preset.id)}
      className={expanded ? "min-w-0" : "w-32 shrink-0"}
    >
      <PresetRasterThumbnail preset={preset} />
    </PresetCard>
  ));

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-fluid font-medium text-foreground">{label}</span>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-0.5 text-fluid text-muted-foreground"
            onClick={onToggleExpand}
          >
            {expanded
              ? t("gallery.less")
              : `${t("gallery.more")} (${presets.length - VISIBLE_COUNT})`}
          </Button>
        )}
      </div>

      {expanded ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(8rem,1fr))] gap-2">{cards}</div>
      ) : (
        <CarouselRow
          ariaLabel={label}
          leftLabel={t("gallery.scrollLeft")}
          rightLabel={t("gallery.scrollRight")}
        >
          {cards}
        </CarouselRow>
      )}
    </div>
  );
};
