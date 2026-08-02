import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AspectRatioPreset, ResizePreset } from "../../config/config.types";
import { useConfig } from "../../config/config-context";
import { useTranslation } from "../../i18n/i18n-context";
import { type CropPresetId, useImageEditorStore } from "../../store/image-editor-store";
import { SegmentedControl } from "../ui/segmented-control";
import { AspectRatioPresets } from "./aspect-ratio-presets";
import { CropDimensions } from "./crop-dimensions";
import { ResizePresets } from "./resize-presets";

type CropTab = "aspectRatio" | "resize";

/** A preset is "free" when its ratio is unconstrained (or omitted). */
const isFreeRatio = (preset: AspectRatioPreset): boolean =>
  preset.ratio === "free" || preset.ratio == null;

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

  const allowCustomRatio = config.crop?.allowCustomRatio !== false;
  // When custom ratios are disallowed the crop is always ratio-constrained.
  const effectiveRatioLocked = allowCustomRatio ? ratioLocked : true;

  // The aspect-ratio presets actually shown — free/unconstrained presets are
  // filtered out when custom ratios are disallowed.
  const visiblePresets = useMemo(() => {
    const all = config.crop?.aspectRatios ?? [];
    const ordered = config.crop?.presets
      ? config.crop.presets.flatMap((id) => {
          const p = all.find((preset) => preset.id === id);
          return p ? [p] : [];
        })
      : all;
    return allowCustomRatio ? ordered : ordered.filter((p) => !isFreeRatio(p));
  }, [config.crop?.aspectRatios, config.crop?.presets, allowCustomRatio]);

  const handleSelect = useCallback(
    (id: CropPresetId) => {
      if (id === cropPreset) return;
      setCropPreset(id);
      onPresetChange?.(id);
    },
    [cropPreset, setCropPreset, onPresetChange],
  );

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

  // The active preset must never remain "free" when custom ratios are disallowed.
  useEffect(() => {
    if (allowCustomRatio || visiblePresets.length === 0) return;
    if (visiblePresets.some((p) => p.id === cropPreset)) return;
    const first = visiblePresets[0].id;
    setCropPreset(first);
    onPresetChange?.(first);
  }, [allowCustomRatio, visiblePresets, cropPreset, setCropPreset, onPresetChange]);

  const markUserEditing = useCallback(() => {
    userEditingRef.current = true;
    clearTimeout(userEditingTimer.current);
    userEditingTimer.current = setTimeout(() => {
      userEditingRef.current = false;
    }, 500);
  }, []);

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
      if (effectiveRatioLocked && resizeHeight > 0 && resizeWidth > 0) {
        const ratio = resizeWidth / resizeHeight;
        const h = Math.max(1, Math.round(w / ratio));
        applyResizeDimensions(w, h);
      } else {
        setResizeWidth(w);
        applyResizeDimensions(w, resizeHeight);
      }
      setActiveResizePreset(null);
    },
    [effectiveRatioLocked, resizeWidth, resizeHeight, applyResizeDimensions, markUserEditing],
  );

  const handleHeightChange = useCallback(
    (val: number) => {
      markUserEditing();
      const h = Math.max(1, Math.round(val));
      if (effectiveRatioLocked && resizeWidth > 0 && resizeHeight > 0) {
        const ratio = resizeWidth / resizeHeight;
        const w = Math.max(1, Math.round(h * ratio));
        applyResizeDimensions(w, h);
      } else {
        setResizeHeight(h);
        applyResizeDimensions(resizeWidth, h);
      }
      setActiveResizePreset(null);
    },
    [effectiveRatioLocked, resizeWidth, resizeHeight, applyResizeDimensions, markUserEditing],
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
      <CropDimensions
        width={resizeWidth}
        height={resizeHeight}
        onWidthChange={handleWidthChange}
        onHeightChange={handleHeightChange}
        ratioLocked={effectiveRatioLocked}
        onToggleRatioLock={allowCustomRatio ? () => setRatioLocked((v) => !v) : undefined}
      />

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
            presets={visiblePresets}
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
