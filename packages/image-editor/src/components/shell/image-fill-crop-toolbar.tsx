import type {
  ImageFillAlignment,
  ImageFillCrop,
  ImageFillCropUpdate,
  ImageFillMode,
} from "@editx/engine";
import type React from "react";
import { useTranslation } from "../../i18n/i18n-context";
import type { TranslationKey } from "../../i18n/translations/en";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui";

interface ImageFillCropToolbarProps {
  crop: ImageFillCrop;
  onChange: (update: ImageFillCropUpdate) => void;
}

const MODE_VALUES: ImageFillMode[] = ["crop", "cover", "fit", "tile"];
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
  const showAlignment = crop.mode === "cover" || crop.mode === "fit";
  const showScale = crop.mode === "crop" || crop.mode === "tile";

  return (
    <div className="flex items-center gap-2">
      <Select value={crop.mode} onValueChange={(mode) => onChange({ mode: mode as ImageFillMode })}>
        <SelectTrigger className="w-24" aria-label={t("fill.mode")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODE_VALUES.map((mode) => (
            <SelectItem key={mode} value={mode}>
              {t(`fill.mode${mode[0].toUpperCase()}${mode.slice(1)}` as TranslationKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {showAlignment && (
        <Select
          value={crop.alignment}
          onValueChange={(alignment) => onChange({ alignment: alignment as ImageFillAlignment })}
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
      )}
      {showScale && (
        <Input
          type="number"
          label={t("fill.scale")}
          aria-label={t("fill.scale")}
          min={crop.mode === "crop" ? 1 : 0.1}
          max={4}
          step={0.1}
          value={String(crop.scale)}
          className="w-28"
          onChange={(event) => {
            const scale = Number(event.target.value);
            if (!Number.isFinite(scale)) return;
            const minimum = crop.mode === "crop" ? 1 : 0.1;
            onChange({ scale: Math.min(4, Math.max(minimum, scale)) });
          }}
        />
      )}
    </div>
  );
};
