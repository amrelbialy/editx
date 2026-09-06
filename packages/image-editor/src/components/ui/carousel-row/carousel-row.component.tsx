import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import { cn } from "../../../utils/cn";
import { IconButton } from "../icon-button";
import { ScrollArea } from "../scroll-area";
import type { CarouselRowProps } from "./carousel-row.types";

/**
 * Horizontal scroll row wrapping the shared `ScrollArea` with left/right
 * chevron affordances. Pure — all labels are injected via props.
 */
export const CarouselRow: React.FC<CarouselRowProps> = (props) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const { children, ariaLabel, leftLabel, rightLabel, scrollStep = 220, className } = props;

  const scrollBy = (direction: -1 | 1) => {
    const viewport = rootRef.current?.querySelector<HTMLElement>(
      "[data-radix-scroll-area-viewport]",
    );
    viewport?.scrollBy({ left: direction * scrollStep, behavior: "smooth" });
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <IconButton
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        label={leftLabel}
        showTooltip={false}
        onClick={() => scrollBy(-1)}
        icon={<ChevronLeft className="h-4 w-4" />}
      />
      <ScrollArea ref={rootRef} className="min-w-0 flex-1" aria-label={ariaLabel}>
        <div className="flex gap-2 pb-1">{children}</div>
      </ScrollArea>
      <IconButton
        size="sm"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        label={rightLabel}
        showTooltip={false}
        onClick={() => scrollBy(1)}
        icon={<ChevronRight className="h-4 w-4" />}
      />
    </div>
  );
};
