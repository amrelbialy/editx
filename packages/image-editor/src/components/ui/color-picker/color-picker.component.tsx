import type React from "react";
import { useCallback } from "react";
import { ColorPalette } from "../color-palette";
import { Slider } from "../slider";
import { type ColorPickerProps, DEFAULT_COLORS } from "./color-picker.types";

export const ColorPicker: React.FC<ColorPickerProps> = (props) => {
  const {
    color,
    opacity,
    onChange,
    onOpacityChange,
    swatches = DEFAULT_COLORS,
    showHexInput = true,
  } = props;

  const handleHexInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/[^0-9a-fA-F]/g, "").substring(0, 6);
      if (val.length === 6) {
        onChange(`#${val}`);
      }
    },
    [onChange],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Native color picker */}
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-40 rounded-lg border border-border bg-transparent cursor-pointer"
      />

      {/* Opacity slider */}
      {opacity !== undefined && onOpacityChange && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Opacity</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(opacity * 100)}
            </span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[opacity]}
            onValueChange={([v]) => onOpacityChange(v)}
          />
        </div>
      )}

      {/* Hex input */}
      {showHexInput && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Hex</span>
          <div className="flex items-center gap-1 flex-1">
            <input
              type="text"
              value={color.replace("#", "").toUpperCase()}
              onChange={handleHexInput}
              maxLength={6}
              className="flex-1 h-7 rounded-md border border-border bg-background px-2 text-xs font-mono"
            />
            <span className="text-xs text-muted-foreground">#</span>
          </div>
        </div>
      )}

      {/* Color swatches */}
      {swatches.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">Default Colors</span>
          <ColorPalette colors={swatches} value={color} onSelect={onChange} />
        </div>
      )}
    </div>
  );
};
