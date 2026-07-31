import { Link, Unlink } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ResizePreset } from "../../config/config.types";
import { useConfig } from "../../config/config-context";
import { useTranslation } from "../../i18n/i18n-context";
import { type CropPresetId, useImageEditorStore } from "../../store/image-editor-store";
import { cn } from "../../utils/cn";
import { IconButton } from "../ui/icon-button";
import { Input } from "../ui/input";
import { SegmentedControl } from "../ui/segmented-control";
import { AspectRatioPresets } from "./aspect-ratio-presets";
import { ResizePresets } from "./resize-presets";

type CropTab = "aspectRatio" | "resize";

export interface CropPanelProps {
  /** Called when user selects an aspect ratio preset. */
  onPresetChange?: (presetId: CropPresetId) => void;
  /** Called when user sets exact resize dimensions. */
  onResizeDimensions?: (width: number, height: number) => void;
  /** Current crop overlay dimensions (updated on overlay drag). */
  cropDimensions?: { width: number; height: number } | null;
}

export const CropPanel: React.FC<CropPanelProps> = ({
  onPresetChange,
  onResizeDimensions,
  cropDimensions,
}) => {
  const cropPreset = useImageEditorStore((s) => s.cropPreset);
  const setCropPreset = useImageEditorStore((s) => s.setCropPreset);
  const config = useConfig();
  const { t } = useTranslation();

  const [tab, setTab] = useState<CropTab>("aspectRatio");
  const [ratioLocked, setRatioLocked] = useState(true);
  const [resizeWidth, setResizeWidth] = useState<number>(0);
  const [resizeHeight, setResizeHeight] = useState<number>(0);
  const [activeResizePreset, setActiveResizePreset] = useState<ResizePreset | null>(null);

  // Track whether the user is typing (to avoid overwriting with overlay dim updates)
  const userEditingRef = useRef(false);
  const userEditingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync from overlay dimensions to inputs (when not actively typing)
  useEffect(() => {
    if (cropDimensions && !userEditingRef.current) {
      setResizeWidth(cropDimensions.width);
      setResizeHeight(cropDimensions.height);
    }
  }, [cropDimensions]);

  // Initialize resize dimensions on tab switch
  useEffect(() => {
    if (tab === "resize" && cropDimensions) {
      setResizeWidth(cropDimensions.width);
      setResizeHeight(cropDimensions.height);
      setActiveResizePreset(null);
    }
  }, [tab, cropDimensions]); // eslint-disable-line react-hooks/exhaustive-deps

  const markUserEditing = useCallback(() => {
    userEditingRef.current = true;
    clearTimeout(userEditingTimer.current);
    userEditingTimer.current = setTimeout(() => {
      userEditingRef.current = false;
    }, 500);
  }, []);

  const handleSelect = (id: CropPresetId) => {
    if (id === cropPreset) return;
    setCropPreset(id);
    onPresetChange?.(id);
  };

  const applyResizeDimensions = useCallback(
    (w: number, h: number) => {
      const clamped_w = Math.max(1, Math.round(w));
      const clamped_h = Math.max(1, Math.round(h));
      setResizeWidth(clamped_w);
      setResizeHeight(clamped_h);
      onResizeDimensions?.(clamped_w, clamped_h);
    },
    [onResizeDimensions],
  );

  const handleWidthChange = useCallback(
    (val: number) => {
      markUserEditing();
      const w = Math.max(1, Math.round(val));
      if (ratioLocked && resizeHeight > 0 && resizeWidth > 0) {
        const ratio = resizeWidth / resizeHeight;
        const h = Math.max(1, Math.round(w / ratio));
        applyResizeDimensions(w, h);
      } else {
        setResizeWidth(w);
        applyResizeDimensions(w, resizeHeight);
      }
      setActiveResizePreset(null);
    },
    [ratioLocked, resizeWidth, resizeHeight, applyResizeDimensions, markUserEditing],
  );

  const handleHeightChange = useCallback(
    (val: number) => {
      markUserEditing();
      const h = Math.max(1, Math.round(val));
      if (ratioLocked && resizeWidth > 0 && resizeHeight > 0) {
        const ratio = resizeWidth / resizeHeight;
        const w = Math.max(1, Math.round(h * ratio));
        applyResizeDimensions(w, h);
      } else {
        setResizeHeight(h);
        applyResizeDimensions(resizeWidth, h);
      }
      setActiveResizePreset(null);
    },
    [ratioLocked, resizeWidth, resizeHeight, applyResizeDimensions, markUserEditing],
  );

  const handlePresetSelect = useCallback(
    (preset: ResizePreset) => {
      setActiveResizePreset(preset);
      setRatioLocked(true);
      applyResizeDimensions(preset.width, preset.height);
    },
    [applyResizeDimensions],
  );

  const resizePresets = config.crop?.resizePresets ?? [];

  return (
    <div className="flex flex-col gap-fluid">
      {/* Crop Area dimensions — visible in both tabs */}
      <div>
        <div className="text-fluid font-medium text-muted-foreground mb-2">Crop Area</div>
        <div className="flex items-stretch gap-1.5">
          {/* Width & Height inputs */}
          <div className="flex-1 flex flex-col gap-2">
            <Input
              type="number"
              min={1}
              label={t("crop.width")}
              labelClassName="w-12"
              suffix="px"
              value={resizeWidth || ""}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              data-testid="resize-width-input"
            />
            <Input
              type="number"
              min={1}
              label={t("crop.height")}
              labelClassName="w-12"
              suffix="px"
              value={resizeHeight || ""}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              data-testid="resize-height-input"
            />
          </div>

          {/* Ratio lock — bracket visually connects the two fields */}
          <div className="relative flex shrink-0 items-center">
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-0 top-1/4 bottom-1/4 w-2 rounded-r-md border-y border-r transition-colors",
                ratioLocked ? "border-primary" : "border-border",
              )}
            />
            <IconButton
              label={ratioLocked ? t("crop.unlockRatio") : t("crop.lockRatio")}
              icon={
                ratioLocked ? (
                  <Link className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />
                ) : (
                  <Unlink className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />
                )
              }
              tooltipSide="left"
              onClick={() => setRatioLocked((v) => !v)}
              aria-pressed={ratioLocked}
              data-testid="resize-ratio-lock"
              className={cn("ml-2", ratioLocked ? "text-primary" : "text-muted-foreground")}
            />
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <SegmentedControl
        ariaLabel={t("a11y.cropMode")}
        value={tab}
        onValueChange={setTab}
        options={[
          { value: "aspectRatio", label: t("crop.aspectRatio") },
          { value: "resize", label: t("crop.resize") },
        ]}
      />

      {/* Aspect Ratio tab */}
      {tab === "aspectRatio" && (
        <div role="tabpanel" id="crop-tab-aspect-ratio">
          <div className="text-fluid font-medium text-muted-foreground mb-1">
            {t("crop.aspectRatio")}
          </div>
          <AspectRatioPresets
            activePreset={cropPreset}
            ariaLabel={t("a11y.aspectRatioPresets")}
            onSelect={handleSelect}
            presets={config.crop?.aspectRatios ?? []}
            presetIds={config.crop?.presets}
          />
        </div>
      )}

      {/* Resize tab — platform presets */}
      {tab === "resize" && resizePresets.length > 0 && (
        <div role="tabpanel" id="crop-tab-resize">
          <ResizePresets
            groups={resizePresets}
            activePreset={activeResizePreset}
            onSelect={handlePresetSelect}
          />
        </div>
      )}
    </div>
  );
};
