import type { ImageFill, ImageFillAlignment, ImageFillMode } from "@editx/engine";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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
  displayDimensions: { width: number; height: number };
  opacity: number;
  imageConfig?: ImageToolConfig;
  onChange: (image: ImageFill) => void;
  onOpacityChange: (opacity: number) => void;
}

const MODE_VALUES: ImageFillMode[] = ["crop", "cover", "fit", "tile"];
const ALIGNMENT_VALUES: ImageFillAlignment[] = [
  "top-left",
  "top-center",
  "top-right",
  "center-left",
  "center",
  "center-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];

export const ShapeImageFillControls: React.FC<ShapeImageFillControlsProps> = (props) => {
  const { image, displayDimensions, opacity, imageConfig, onChange, onOpacityChange } = props;

  const { t } = useTranslation();

  const [originalDimensions, setOriginalDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const automatic = image.mode === "cover" || image.mode === "fit";

  useEffect(() => {
    if (!image.src) {
      setOriginalDimensions(null);
      return;
    }

    let active = true;
    const source = new Image();
    source.onload = () => {
      if (active) {
        setOriginalDimensions({ width: source.naturalWidth, height: source.naturalHeight });
      }
    };
    source.onerror = () => {
      if (active) setOriginalDimensions(null);
    };
    source.src = image.src;

    return () => {
      active = false;
    };
  }, [image.src]);

  const handleFile = useCallback(
    async (file: File) => {
      const processed = await processImageFile(file, imageConfig);
      setOriginalDimensions({ width: processed.width, height: processed.height });
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

      <Section label="Dimensions">
        <div className="grid grid-cols-2 gap-2 text-fluid">
          <div className="flex flex-col gap-0.5">
            <span className="text-fluid text-muted-foreground">Display</span>
            <span className="tabular-nums">
              {Math.round(displayDimensions.width)} × {Math.round(displayDimensions.height)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-fluid text-muted-foreground">Original</span>
            <span className="tabular-nums">
              {originalDimensions
                ? `${Math.round(originalDimensions.width)} × ${Math.round(originalDimensions.height)}`
                : "-"}
            </span>
          </div>
        </div>
      </Section>

      <Section label={t("fill.mode")}>
        <Select
          value={image.mode}
          onValueChange={(value) => {
            const mode = value as ImageFillMode;
            const preserveAlignment = automatic && (mode === "cover" || mode === "fit");
            onChange({
              ...image,
              mode,
              alignment: preserveAlignment ? image.alignment : "center",
              offsetX: 0,
              offsetY: 0,
              scale: 1,
            });
          }}
        >
          <SelectTrigger>
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
      </Section>

      {automatic ? (
        <Section label={t("fill.alignment")}>
          <Select
            value={image.alignment ?? "center"}
            onValueChange={(alignment) =>
              onChange({ ...image, alignment: alignment as ImageFillAlignment })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALIGNMENT_VALUES.map((alignment) => (
                <SelectItem key={alignment} value={alignment}>
                  {t(
                    `fill.alignment${alignment
                      .split("-")
                      .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
                      .join("")}` as TranslationKey,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>
      ) : (
        <>
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
            label={t("fill.scale")}
            value={image.scale}
            min={image.mode === "crop" ? 1 : 0.1}
            max={4}
            step={0.1}
            onChange={(scale) => onChange({ ...image, scale })}
            formatValue={(scale) => `${scale.toFixed(1)}x`}
          />
        </>
      )}
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
