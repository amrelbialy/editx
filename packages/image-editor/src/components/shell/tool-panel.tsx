import { X } from "lucide-react";
import type React from "react";
import { useEffect } from "react";
import { cn } from "../../utils/cn";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface ToolPanelProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const ToolPanel: React.FC<ToolPanelProps> = (props) => {
  const { open, title, onClose, children } = props;

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
      {/* Backdrop — narrow only */}
      <div
        className="absolute inset-0 bg-black/40 z-30 @3xl/editor:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Tool options"}
        data-text-toolbar
        className={cn(
          // Narrow: bottom sheet — slides up from bottom
          "absolute bottom-0 left-0 right-0 z-40",
          "bg-card rounded-t-xl max-h-[60vh] flex flex-col",
          "animate-in slide-in-from-bottom duration-200",
          // Wide: side panel — slides in from left
          "@3xl/editor:relative @3xl/editor:bottom-auto @3xl/editor:left-auto @3xl/editor:right-auto",
          "@3xl/editor:z-auto @3xl/editor:rounded-none @3xl/editor:max-h-none",
          "@3xl/editor:w-[280px] @3xl/editor:shrink-0",
          "@3xl/editor:border-r @3xl/editor:border-border",
          "@3xl/editor:[--tw-enter-translate-y:0] @3xl/editor:slide-in-from-left-4",
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between h-10 px-3 border-b border-border">
            {/* Narrow: drag handle + title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30 @3xl/editor:hidden" />
              <span className="text-sm font-medium">{title}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="p-4">{children}</div>
        </ScrollArea>
      </aside>
    </>
  );
};
