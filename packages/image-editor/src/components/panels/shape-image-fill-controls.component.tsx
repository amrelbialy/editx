import type { ImageFill, ImageFillFit } from "@editx/engine";
import type React from "react";
import { useCallback } from "react";
import type { ImageToolConfig } from "../../config/config.types";
import { useTranslation } from "../../i18n/i18n-context";
import type { TranslationKey } from "../../i18n/translations/en";
import { processImageFile } from "../../utils/process-image-file";
import {
  Input,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SliderField,
} from "../ui";
import { ImagePicker } from "./image-picker.component";

export interface ShapeImageFillControlsProps {
  image: ImageFill;
  opacity: number;
  imageConfig?: ImageToolConfig;
  onChange: (image: ImageFill) => void;
  onOpacityChange: (opacity: number) => void;
}

const FIT_VALUES: ImageFillFit[] = ["cover", "contain", "tile", "stretch"];

export const ShapeImageFillControls: React.FC<ShapeImageFillControlsProps> = (props) => {
  const { image, opacity, imageConfig, onChange, onOpacityChange } = props;

  const { t } = useTranslation();

  const handleFile = useCallback(
    async (file: File) => {
      const processed = await processImageFile(file, imageConfig);
      onChange({ ...image, src: processed.src });
    },
    [image, imageConfig, onChange],
  );

  const handleOffset = useCallback(
    (axis: "x" | "y", event: React.ChangeEvent<HTMLInputElement>) => {
      const value = parseFloat(event.target.value);
      if (Number.isNaN(value)) return;
      onChange({
        ...image,
        offsetX: axis === "x" ? value : image.offsetX,
        offsetY: axis === "y" ? value : image.offsetY,
      });
    },
    [image, onChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <ImagePicker src={image.src} onSelect={handleFile} />

      <Section label={t("fill.fit")}>
        <Select
          value={image.fit}
          onValueChange={(fit) => onChange({ ...image, fit: fit as ImageFillFit })}
        >
          <SelectTrigger>
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
      </Section>

      <Section label="Offset">
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            label="X"
            value={image.offsetX}
            onChange={(event) => handleOffset("x", event)}
          />
          <Input
            type="number"
            label="Y"
            value={image.offsetY}
            onChange={(event) => handleOffset("y", event)}
          />
        </div>
      </Section>

      <SliderField
        label="Scale"
        value={image.scale}
        min={0.1}
        max={4}
        step={0.1}
        onChange={(scale) => onChange({ ...image, scale })}
        formatValue={(scale) => `${scale.toFixed(1)}x`}
      />
      <SliderField
        label="Opacity"
        value={Math.round(opacity * 100)}
        min={0}
        max={100}
        step={1}
        onChange={(value) => onOpacityChange(value / 100)}
        formatValue={(value) => `${Math.round(value)}%`}
      />
    </div>
  );
};
