import { Check, RotateCcw } from "lucide-react";
import type React from "react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";

interface ContextualBarProps {
  visible: boolean;
  onReset?: () => void;
  onDone?: () => void;
  children?: React.ReactNode;
}

export const ContextualBar: React.FC<ContextualBarProps> = ({
  visible,
  onReset,
  onDone,
  children,
}) => {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between h-9 px-3 @5xl/editor:h-10 @5xl/editor:px-4",
        "bg-card border-b border-border",
        "animate-in fade-in-0 slide-in-from-top-1 duration-150",
      )}
    >
      {/* Tool-specific controls */}
      <div className="flex items-center gap-1.5 flex-1 @5xl/editor:gap-2">{children}</div>

      {/* Right: Reset + Done (always present) */}
      <div className="flex items-center gap-1 @5xl/editor:gap-1.5">
        {onReset && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="gap-1 h-7 text-xs @5xl/editor:h-8 @5xl/editor:gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />
            Reset
          </Button>
        )}
        {onDone && (
          <Button
            variant="default"
            size="sm"
            onClick={onDone}
            className="gap-1 h-7 text-xs @5xl/editor:h-8 @5xl/editor:gap-1.5"
          >
            <Check className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />
            Done
          </Button>
        )}
      </div>
    </div>
  );
};
