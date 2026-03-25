import type React from "react";
import { cn } from "../../../utils/cn";

interface SpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-3",
};

export const Spinner: React.FC<SpinnerProps> = ({ className, size = "md", label = "Loading" }) => {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        "animate-spin rounded-full",
        "border-muted-foreground/30",
        "border-t-primary",
        sizeMap[size],
        className,
      )}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
