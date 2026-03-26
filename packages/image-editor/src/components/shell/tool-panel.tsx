import { X } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "../../i18n/i18n-context";
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
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const { t } = useTranslation();

  // Store the trigger element when panel opens; restore focus on close
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement;
      // Focus the first interactive element inside the panel after mount
      requestAnimationFrame(() => {
        const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        );
        firstFocusable?.focus({ preventScroll: true });
      });
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [open]);

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
        className="absolute inset-0 bg-black/40 z-30 @xl/editor:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? t("a11y.toolOptions")}
        data-text-toolbar
        className={cn(
          // Narrow: bottom sheet — slides up from bottom
          "absolute bottom-0 left-0 right-0 z-40",
          "bg-card rounded-t-xl max-h-[60vh] flex flex-col",
          "animate-in slide-in-from-bottom duration-200",
          // Wide: side panel — slides in from left
          "@xl/editor:relative @xl/editor:bottom-auto @xl/editor:left-auto @xl/editor:right-auto",
          "@xl/editor:z-auto @xl/editor:rounded-none @xl/editor:max-h-none",
          "@xl/editor:w-70 @xl/editor:shrink-0",
          "@xl/editor:border-r @xl/editor:border-border",
          "@xl/editor:[--tw-enter-translate-y:0] @xl/editor:slide-in-from-left-4",
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between h-9 px-3 border-b border-border @5xl/editor:h-10">
            {/* Narrow: drag handle + title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/30 @xl/editor:hidden" />
              <span className="text-sm font-medium @5xl/editor:text-base">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 @5xl/editor:h-7 @5xl/editor:w-7"
              onClick={onClose}
              aria-label={t("panel.close")}
            >
              <X className="h-3.5 w-3.5 @5xl/editor:h-4 @5xl/editor:w-4" />
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
