import type React from "react";
import { cn } from "../../../utils/cn";
import type { ColorPaletteProps } from "./color-palette.types";

export const ColorPalette: React.FC<ColorPaletteProps> = (props) => {
  const { colors, value, onSelect, className } = props;

  return (
    <div className={cn("grid grid-cols-8 gap-1.5", className)}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onSelect(c)}
          className={cn(
            "w-7 h-7 rounded-md border transition-transform hover:scale-110",
            value === c ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "border-border",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
};
