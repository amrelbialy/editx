import type React from "react";
import type { ShapePreset, TextPreset } from "../../../config/config.types";
import { usePresetThumbnail } from "../../preset-thumbnail-provider";
import { Skeleton } from "../../ui";
import type { GalleryPreset } from "./preset-category-row.component";

interface PresetRasterThumbnailProps {
  preset: GalleryPreset;
}

export const PresetRasterThumbnail: React.FC<PresetRasterThumbnailProps> = (props) => {
  const { preset } = props;
  const renderable = toRenderablePreset(preset);
  const { url, failed } = usePresetThumbnail(renderable);

  if (failed) {
    return <div aria-hidden="true" className="h-14 w-24 rounded-sm bg-muted-foreground/10" />;
  }
  if (!url) return <Skeleton className="h-14 w-24" data-preset-thumbnail-loading />;
  return (
    <img
      src={url}
      alt=""
      draggable={false}
      className="h-full w-full object-contain"
      data-preset-thumbnail-image
    />
  );
};

function toRenderablePreset(preset: GalleryPreset): ShapePreset | TextPreset | null {
  if (preset.blocks) return preset as TextPreset;
  if (preset.shape && preset.fill) return preset as ShapePreset;
  return null;
}
