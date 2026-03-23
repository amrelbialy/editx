import { X } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface ToolSheetProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const ToolSheet: React.FC<ToolSheetProps> = ({ open, title, onClose, children }) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 z-30" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Tool options"}
        className={cn(
          "absolute bottom-0 left-0 right-0 z-40",
          "bg-card rounded-t-xl",
          "max-h-[60vh] flex flex-col",
          "animate-in slide-in-from-bottom duration-200",
        )}
      >
        {/* Handle + Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-1 rounded-full bg-muted-foreground/30 mx-auto" />
            {title && <span className="text-sm font-medium">{title}</span>}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">{children}</div>
        </ScrollArea>
      </div>
    </>
  );
};
