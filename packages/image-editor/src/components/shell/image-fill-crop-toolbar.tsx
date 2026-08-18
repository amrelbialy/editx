import type {
  ImageFillAlignment,
  ImageFillCrop,
  ImageFillCropUpdate,
  ImageFillFit,
} from "@editx/engine";
import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import type { TranslationKey } from "../../i18n/translations/en";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui";

interface ImageFillCropToolbarProps {
  crop: ImageFillCrop;
  onChange: (update: ImageFillCropUpdate) => void;
}

const FIT_VALUES: ImageFillFit[] = ["cover", "contain", "tile", "stretch"];
const ALIGNMENT_OPTIONS: { value: ImageFillAlignment; label: TranslationKey }[] = [
  { value: "top-left", label: "fill.alignmentTopLeft" },
  { value: "top-center", label: "fill.alignmentTopCenter" },
  { value: "top-right", label: "fill.alignmentTopRight" },
  { value: "center-left", label: "fill.alignmentCenterLeft" },
  { value: "center", label: "fill.alignmentCenter" },
  { value: "center-right", label: "fill.alignmentCenterRight" },
  { value: "bottom-left", label: "fill.alignmentBottomLeft" },
  { value: "bottom-center", label: "fill.alignmentBottomCenter" },
  { value: "bottom-right", label: "fill.alignmentBottomRight" },
];

export const ImageFillCropToolbar: React.FC<ImageFillCropToolbarProps> = (props) => {
  const { crop, onChange } = props;
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Select value={crop.fit} onValueChange={(fit) => onChange({ fit: fit as ImageFillFit })}>
        <SelectTrigger className="w-24" aria-label={t("fill.fit")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIT_VALUES.map((fit) => (
            <SelectItem key={fit} value={fit}>
              {t(`fill.fit${fit[0].toUpperCase()}${fit.slice(1)}` as TranslationKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={crop.alignment}
        onValueChange={(alignment) =>
          onChange({
            alignment: alignment as ImageFillAlignment,
            offsetX: 0,
            offsetY: 0,
          })
        }
      >
        <SelectTrigger className="w-36" aria-label={t("fill.alignment")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ALIGNMENT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {t(option.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        label="Scale"
        aria-label="Scale"
        min={0.1}
        max={4}
        step={0.1}
        value={crop.scale}
        className="w-28"
        onChange={(event) => {
          const scale = Number(event.target.value);
          if (Number.isFinite(scale)) onChange({ scale: Math.min(Math.max(scale, 0.1), 4) });
        }}
      />
    </div>
  );
};
