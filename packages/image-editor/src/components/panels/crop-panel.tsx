import {
  Link,
  Monitor,
  RectangleHorizontal,
  RectangleVertical,
  Scan,
  Smartphone,
  Square,
  Unlink,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ResizePreset } from "../../config/config.types";
import { useConfig } from "../../config/config-context";
import { useTranslation } from "../../i18n/i18n-context";
import { type CropPresetId, useImageEditorStore } from "../../store/image-editor-store";
import { cn } from "../../utils/cn";
import { ResizePresets } from "./resize-presets";

const presets: { id: CropPresetId; label: string; icon: React.ReactNode }[] = [
  { id: "free", label: "Free", icon: <Scan className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" /> },
  {
    id: "original",
    label: "Original",
    icon: <RectangleHorizontal className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
  { id: "1:1", label: "1:1", icon: <Square className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" /> },
  {
    id: "4:3",
    label: "4:3",
    icon: <RectangleHorizontal className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
  {
    id: "3:4",
    label: "3:4",
    icon: <RectangleVertical className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
  {
    id: "16:9",
    label: "16:9",
    icon: <Monitor className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
  {
    id: "9:16",
    label: "9:16",
    icon: <Smartphone className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />,
  },
];

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
    <div className="flex flex-col gap-3">
      {/* Tab switcher */}
      <div
        role="tablist"
        aria-label={t("a11y.cropMode")}
        className="flex bg-muted rounded-lg p-0.5"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "aspectRatio"}
          aria-controls="crop-tab-aspect-ratio"
          id="crop-tab-aspect-ratio-trigger"
          onClick={() => setTab("aspectRatio")}
          className={cn(
            "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors @5xl/editor:text-base",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            tab === "aspectRatio"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("crop.aspectRatio")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "resize"}
          aria-controls="crop-tab-resize"
          id="crop-tab-resize-trigger"
          onClick={() => setTab("resize")}
          className={cn(
            "flex-1 text-sm font-medium py-1.5 rounded-md transition-colors @5xl/editor:text-base",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            tab === "resize"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t("crop.resize")}
        </button>
      </div>

      {/* Aspect Ratio tab */}
      {tab === "aspectRatio" && (
        <div
          role="tabpanel"
          id="crop-tab-aspect-ratio"
          aria-labelledby="crop-tab-aspect-ratio-trigger"
        >
          <div className="text-sm font-medium text-muted-foreground mb-1 @5xl/editor:text-base">
            {t("crop.aspectRatio")}
          </div>
          <fieldset className="grid grid-cols-2 gap-1.5" aria-label={t("a11y.aspectRatioPresets")}>
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelect(preset.id)}
                data-testid={`crop-preset-${preset.id}`}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-md px-1.5 py-2 text-sm transition-colors @5xl/editor:gap-1 @5xl/editor:px-2 @5xl/editor:py-2.5 @5xl/editor:text-base",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                  cropPreset === preset.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {preset.icon}
                {preset.label}
              </button>
            ))}
          </fieldset>
        </div>
      )}

      {/* Resize tab */}
      {tab === "resize" && (
        <div
          role="tabpanel"
          id="crop-tab-resize"
          aria-labelledby="crop-tab-resize-trigger"
          className="flex flex-col gap-4"
        >
          {/* Crop Area dimensions */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2 @5xl/editor:text-base">
              Crop Area
            </div>
            <div className="flex flex-col gap-2">
              {/* Width */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="crop-resize-width"
                  className="text-sm text-muted-foreground w-12 shrink-0 @5xl/editor:text-base"
                >
                  {t("crop.width")}
                </label>
                <div className="flex-1 flex items-center gap-1 bg-muted rounded-md px-2 py-1.5">
                  <input
                    id="crop-resize-width"
                    type="number"
                    value={resizeWidth || ""}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    min={1}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none tabular-nums w-0 @5xl/editor:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:rounded-sm"
                    data-testid="resize-width-input"
                  />
                  <span className="text-sm text-muted-foreground @5xl/editor:text-base">px</span>
                </div>
              </div>

              {/* Ratio lock */}
              <div className="flex justify-center">
                <button
                  onClick={() => setRatioLocked((v) => !v)}
                  className={cn(
                    "p-1 rounded transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                    ratioLocked
                      ? "text-primary hover:text-primary/80"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label={ratioLocked ? t("crop.unlockRatio") : t("crop.lockRatio")}
                  aria-pressed={ratioLocked}
                  title={ratioLocked ? t("crop.unlockRatio") : t("crop.lockRatio")}
                  data-testid="resize-ratio-lock"
                >
                  {ratioLocked ? (
                    <Link className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />
                  ) : (
                    <Unlink className="h-4 w-4 @5xl/editor:h-5 @5xl/editor:w-5" />
                  )}
                </button>
              </div>

              {/* Height */}
              <div className="flex items-center gap-2">
                <label
                  htmlFor="crop-resize-height"
                  className="text-sm text-muted-foreground w-12 shrink-0 @5xl/editor:text-base"
                >
                  {t("crop.height")}
                </label>
                <div className="flex-1 flex items-center gap-1 bg-muted rounded-md px-2 py-1.5">
                  <input
                    id="crop-resize-height"
                    type="number"
                    value={resizeHeight || ""}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    min={1}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none tabular-nums w-0 @5xl/editor:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background focus-visible:rounded-sm"
                    data-testid="resize-height-input"
                  />
                  <span className="text-sm text-muted-foreground @5xl/editor:text-base">px</span>
                </div>
              </div>
            </div>
          </div>

          {/* Platform presets */}
          {resizePresets.length > 0 && (
            <ResizePresets
              groups={resizePresets}
              activePreset={activeResizePreset}
              onSelect={handlePresetSelect}
            />
          )}
        </div>
      )}
    </div>
  );
};
